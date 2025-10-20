import type { Change } from 'diff'

import { AssertionError } from 'node:assert/strict'

import chalk from 'chalk'
import { diffChars, diffLines } from 'diff'

import { makePrettyPath } from './path-utils.js'

const explanation = `${chalk.green('+ actual')} ${chalk.red('- expected')}`

/**
 * Color a single change based on a character diff. Added characters are colored green, Removed
 * characters  are colored red.
 *
 * @param change
 *   The change to color.
 * @returns
 *   The colored text.
 */
function colorCharChange(change: Change): string {
  if (change.added) {
    return chalk.green(change.value)
  }

  if (change.removed) {
    return chalk.red(change.value)
  }

  return change.value
}

/**
 * Prefix a line with `+` and color it green.
 *
 * @param line
 *   The line to color.
 * @returns
 *   The colored line.
 */
function colorActualLine(line: string): string {
  return `${chalk.green(`+ ${line}`)}\n`
}

/**
 * Prefix a line with `-` and color it red.
 *
 * @param line
 *   The line to color.
 * @returns
 *   The colored line.
 */
function colorExpectedLine(line: string): string {
  return `${chalk.red(`- ${line}`)}\n`
}

/**
 * Prefix a line with whitespace.
 *
 * @param line
 *   The line to prefix.
 * @returns
 *   The prefixeded line.
 */
function colorUnmodifiedLine(line: string): string {
  return `  ${line}\n`
}

/**
 * Color all lines in a change.
 *
 * @param change
 *   The change to color.
 * @param colorFunction
 *   A function used to color each change.
 * @returns
 *   The colored change.
 */
function colorLines(change: Change, colorFunction: (line: string) => string): string {
  return change.value.split('\n').slice(0, -1).map(colorFunction).join('')
}

/**
 * Color a change based on a line diff. Added lines are prefixed with a `+` and colored green.
 * Removed lines are prefixed with a `-` and colored red.
 *
 * @param change
 *   The change to color.
 * @returns
 *   The colored text.
 */
function colorLineChange(change: Change): string {
  if (change.added) {
    return colorLines(change, colorActualLine)
  }

  if (change.removed) {
    return colorLines(change, colorExpectedLine)
  }

  return colorLines(change, colorUnmodifiedLine)
}

export interface AssertEqualOptions {
  /**
   * The file URL which is related to the assertion. Typically this is a file fixture.
   */
  url?: string | URL
}

/**
 * Assert two strings are equal.
 *
 * If the strings are not equal, an assertion error will be thrown. This assertion error contains
 * a pretty diff of the two strings.
 *
 * @param actual
 *   The actual value that was produced.
 * @param expected
 *   The value that was expected.
 * @param options
 *   Additional options. See {@link AssertEqualOptions}..
 */
export function assertEqual(
  actual: string,
  expected: string,
  options?: AssertEqualOptions
): undefined {
  if (expected === actual) {
    return
  }

  const hasNewlines = expected.includes('\n') && actual.includes('\n')
  const changes = hasNewlines ? diffLines(expected, actual) : diffChars(expected, actual)
  const result = changes.map(hasNewlines ? colorLineChange : colorCharChange).join('')
  let message = 'Expected values to be strictly equal:\n'
  if (options?.url) {
    message += `${makePrettyPath(options.url)}\n`
  }

  message += `${explanation}\n\n${result}\n`
  const error = new AssertionError({ message, actual, expected, operator: '===' })
  error.generatedMessage = true
  throw error
}
