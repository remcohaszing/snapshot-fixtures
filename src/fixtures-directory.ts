import { AssertionError } from 'node:assert/strict'
import { readdirSync, statSync } from 'node:fs'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { parse } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { isCI } from 'ci-info'
import { read } from 'to-vfile'
import { type VFile } from 'vfile'

import { assertEqual } from './assert-equal.js'
import { makePrettyPath } from './path-utils.js'

/**
 * A function to generate an actual value from a test.
 *
 * @param file
 *   The input file that was read as a [VFile](https://github.com/vfile/vfile).
 * @param options
 *   Extra options for the test fixture. Options can be defined by placing an file name
 *   `options.cjs`, `options.js`, `options.json` or `options.mjs` in the fixture directory. This
 *   file is imported, and the default export is passed to the generate function.
 * @returns
 *   The string that should match the expected output.
 */
type Generate<Options> = (
  file: VFile,
  options: Options
) => Buffer | PromiseLike<Buffer | VFile | string> | VFile | string

interface FixtureTest<Options> {
  /**
   * The fixture input file name to read. If the input has an extension, it’s treated as an exact
   * file name. Otherwise, a file is looked up in the fixture directory whose base name matches the
   * input.
   *
   * @default 'input'
   */
  input?: string

  /**
   * The file name the expected output should be written to. If not specified, the test name is
   * used.
   */
  expected?: string

  /**
   * @see {@link Generate}
   */
  generate: Generate<Options>
}

/**
 * A test to run, either as a fixture test object, or as a plain function.
 */
export type Test<Options> = FixtureTest<Options> | Generate<Options>

export interface TestFixturesDirectoryOptions<Options> {
  /**
   * The directory containing fixtures as a URL or URL string.
   */
  directory: URL | string

  /**
   * If true, format the generated value with Prettier.
   *
   * @default false
   */
  prettier?: boolean

  /**
   * A mapping of test name to a fixture test.
   */
  tests: Record<string, Test<Options>>

  /**
   * If true, overwrite the expected content with the actual content. In CI, the output is never
   * written.
   */
  write?: boolean
}

/**
 * Get the file URL of the input file.
 *
 * @param directory
 *   The fixture directory to search.
 * @param input
 *   The input file name to look for.
 * @returns
 *   The file URL of the input file.
 */
async function getInputUrl(directory: URL, input = 'input'): Promise<URL> {
  const parsedPath = parse(input)
  if (parsedPath.ext) {
    return new URL(input, directory)
  }

  const fileNames = await readdir(directory)
  if (fileNames.includes(input)) {
    return new URL(input, directory)
  }

  for (const fileName of await readdir(directory)) {
    if (fileName.startsWith(`${input}.`)) {
      return new URL(fileName, directory)
    }
  }

  throw new Error(`Input not found in in directory ${makePrettyPath(directory)}`)
}

/**
 * Get the options of a test fixture.
 *
 * @param directory
 *   The fixture directory to search.
 * @returns
 *   The test options loaded from the options file.
 */
async function getOptions(directory: URL): Promise<unknown> {
  for (const fileName of await readdir(directory)) {
    switch (fileName) {
      case 'options.json':
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return JSON.parse(await readFile(new URL(fileName, directory), 'utf8'))
      case 'options.cjs':
      case 'options.js':
      case 'options.mjs':
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return (await import(fileURLToPath(new URL(fileName, directory)))).default as unknown
      default:
        break
    }
  }

  return {}
}

// This is only covered outside CI.
/* c8 ignore start */
/**
 * Write content to a file.
 *
 * @param url
 *   The file URL to write to.
 * @param content
 *   The content to write to the file.
 */
async function outputFile(url: URL, content: string): Promise<undefined> {
  // eslint-disable-next-line no-console
  console.log('Writing', makePrettyPath(url))
  await writeFile(url, content)
}

/* c8 ignore stop */

/**
 * Create a test for a single test fixture directory.
 *
 * @internal
 * @param dir
 *   The test fixture firectory
 * @param name
 *   The name of the test.
 * @param write
 *   Whether or not to write content.
 * @param format
 *   Whether or not to format the contant using Prettier.
 * @param spec
 *   The test ro tun.
 * @returns
 *   A function to run the fixture test.
 */
export function createTest<T>(
  dir: URL,
  name: string,
  write: boolean | undefined,
  format: boolean | undefined,
  spec: Test<T>
): () => Promise<undefined> {
  return async function run(): Promise<undefined> {
    let generate: Generate<T>
    let inputUrl: URL
    let expectedUrl: URL

    if (typeof spec === 'function') {
      generate = spec
      inputUrl = await getInputUrl(dir)
      expectedUrl = new URL(name, dir)
    } else {
      generate = spec.generate
      inputUrl = await getInputUrl(dir, spec.input)
      expectedUrl = new URL(spec.expected ?? name, dir)
    }

    const fixtureOptions = await getOptions(dir)
    const file = await read(inputUrl, 'utf8')

    let expected: string | undefined
    try {
      expected = await readFile(expectedUrl, 'utf8')
      // This is only covered in CI.
      /* c8 ignore start */
    } catch (error) {
      if (isCI) {
        throw error
      }
    }

    /* c8 ignore stop */

    let actual = String(await generate(file, fixtureOptions as T))
    if (format) {
      const prettier = await import('prettier')
      const fileInfo = await prettier.getFileInfo(expectedUrl, { resolveConfig: true })
      if (fileInfo.inferredParser && !fileInfo.ignored) {
        const prettierOptions = await prettier.resolveConfig(expectedUrl, { editorconfig: true })
        actual = await prettier.format(actual, {
          ...prettierOptions,
          filepath: fileURLToPath(expectedUrl),
          parser: fileInfo.inferredParser
        })
      }
    }

    // This is only covered in CI.
    /* c8 ignore start */
    if (expected == null) {
      return outputFile(expectedUrl, actual)
    }

    /* c8 ignore stop */

    try {
      assertEqual(actual, expected, { url: expectedUrl })
    } catch (error) {
      // This is only covered outside of CI.
      /* c8 ignore start */
      if (write && error instanceof AssertionError) {
        await outputFile(expectedUrl, actual)
      }

      /* c8 ignore stop */

      throw error
    }
  }
}

/**
 * Create a test suite for a fixtures directory based on
 * [`node:test`](https://nodejs.org/api/test.html). A fixtures directory is a directory that
 * contains other directories. For each of these directories a nested test suite is created. For
 * each of these nested test suites, a test is created based on the tests passed. Each test reads
 * the input file, uses the given test function to generate output, and compares it to the content
 * of the expected output file.
 *
 * @template Options
 * The type of the options you expect to be defined.
 * @param options
 *   The {@link TestFixturesDirectoryOptions} to pass in.
 */
export function testFixturesDirectory<Options>(
  options: TestFixturesDirectoryOptions<Options>
): undefined {
  const tests = Object.entries(options.tests)
  const directory = new URL(options.directory)
  if (!directory.pathname.endsWith('/')) {
    directory.pathname += '/'
  }

  for (const dirname of readdirSync(directory)) {
    const dirUrl = new URL(`${dirname}/`, directory)
    const dir = statSync(new URL(dirname, directory))
    if (!dir.isDirectory()) {
      continue
    }

    test(dirname, async (t) => {
      if (tests.length === 1) {
        const [[name, spec]] = tests
        const run = createTest(dirUrl, name, options.write, options.prettier, spec)
        await run()
      } else {
        for (const [name, spec] of tests) {
          await t.test(name, createTest(dirUrl, name, options.write, options.prettier, spec))
        }
      }
    })
  }
}
