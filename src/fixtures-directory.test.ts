import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { pathToFileURL } from 'node:url'

import { testFixturesDirectory } from 'snapshot-fixtures'
import { VFile } from 'vfile'

import { createTest } from './fixtures-directory.js'

describe('testFixturesDirectory', () => {
  describe('directory no trailing slash', () => {
    testFixturesDirectory({
      directory: new URL('../fixtures', import.meta.url),
      prettier: true,
      write: true,
      tests: {
        'test-options.json'(file, options) {
          return JSON.stringify(options, undefined, 2)
        },

        'test-function.txt': String,

        'test-object.txt': {
          generate: String
        },

        'custom-io': {
          input: 'custom-input.txt',
          expected: 'custom-output.txt',
          generate: String
        }
      }
    })
  })

  describe('directory trailing slash', () => {
    testFixturesDirectory({
      directory: new URL('../fixtures/', import.meta.url),
      tests: {
        'trailing-slash.txt'() {
          return 'Trailing slash'
        }
      }
    })
  })

  test('throws assertion error if actual doesn’t match expected', async () => {
    const dir = join(tmpdir(), randomUUID())
    let file: VFile | undefined
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'input'), 'in\n')
    await writeFile(join(dir, 'expected'), 'old\n')

    const run = createTest(pathToFileURL(`${dir}/`), 'expected', false, false, (vfile) => {
      file = vfile
      return 'new\n'
    })

    await assert.rejects(run(), /\+ new/)

    assert(file instanceof VFile)
    assert.equal(file.value, 'in\n')
    assert.equal(file.path, join(dir, 'input'))

    await rm(dir, { force: true, recursive: true })
  })

  test('throws if input file doesn’t exist', async () => {
    const dir = join(tmpdir(), randomUUID())
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'expected'), 'old\n')

    const run = createTest(pathToFileURL(`${dir}/`), 'expected', false, false, () => '')

    await assert.rejects(run(), new Error(`Input not found in in directory ${dir}`))

    await rm(dir, { force: true, recursive: true })
  })
})
