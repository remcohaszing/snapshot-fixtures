import { sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import chalk from 'chalk'

/**
 * Turn a file URL into a pretty path for printing to the console.
 *
 * - A trailing slash is stripped.
 * - The `cwd` is turned gray.
 *
 * @param url
 *   The file URL to format.
 * @returns
 *   The formatted path
 */
export function makePrettyPath(url: URL | string): string {
  let prettyPath = fileURLToPath(url)
  if (prettyPath.endsWith('/')) {
    prettyPath = prettyPath.slice(0, -1)
  }

  const cwd = process.cwd() + sep

  if (prettyPath.startsWith(cwd)) {
    return chalk.gray(prettyPath.slice(0, cwd.length)) + prettyPath.slice(cwd.length)
  }

  return prettyPath
}
