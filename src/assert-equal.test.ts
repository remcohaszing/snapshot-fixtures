import assert, { AssertionError } from 'node:assert/strict'
import { describe, test } from 'node:test'

import chalk from 'chalk'
import { assertEqual } from 'snapshot-fixtures'

/**
 * Join lines into a multiline string.
 *
 * @param lines
 *   The lines to join.
 * @returns
 *   The multiline string
 */
function fromLines(...lines: string[]): string {
  return `${lines.join('\n')}\n`
}

describe('assertEqual', () => {
  test('doesn’t throw if actual equals expected', () => {
    assertEqual(fromLines('cat', 'dog'), fromLines('cat', 'dog'))
  })

  test('supports singleline diffs', () => {
    assert.throws(
      () => assertEqual('rat', 'cat'),
      (error) => {
        assert.ok(error instanceof AssertionError)
        assert.equal(
          error.message,
          fromLines(
            'Expected values to be strictly equal:',
            `${chalk.green('+ actual')} ${chalk.red('- expected')}`,
            '',
            `${chalk.red('c')}${chalk.green('r')}at`
          )
        )
        assert.equal(error.actual, 'rat')
        assert.equal(error.expected, 'cat')
        assert.equal(error.operator, '===')
        assert.ok(error.generatedMessage)
        return true
      }
    )
  })

  test('supports multiline diffs', () => {
    assert.throws(
      () => assertEqual(fromLines('cat', 'dog', 'fish'), fromLines('cat', 'parrot', 'fish')),
      (error) => {
        assert.ok(error instanceof AssertionError)
        assert.equal(
          error.message,
          fromLines(
            'Expected values to be strictly equal:',
            `${chalk.green('+ actual')} ${chalk.red('- expected')}`,
            '',
            '  cat',
            chalk.red('- parrot'),
            chalk.green('+ dog'),
            '  fish',
            ''
          )
        )
        assert.equal(error.actual, fromLines('cat', 'dog', 'fish'))
        assert.equal(error.expected, fromLines('cat', 'parrot', 'fish'))
        assert.equal(error.operator, '===')
        assert.ok(error.generatedMessage)
        return true
      }
    )
  })

  test('supports url option', () => {
    assert.throws(
      () => assertEqual('rat', 'cat', import.meta),
      (error) => {
        assert.ok(error instanceof AssertionError)
        assert.equal(
          error.message,
          fromLines(
            'Expected values to be strictly equal:',
            `${chalk.gray(`${process.cwd()}/`)}dist/assert-equal.test.js`,
            `${chalk.green('+ actual')} ${chalk.red('- expected')}`,
            '',
            `${chalk.red('c')}${chalk.green('r')}at`
          )
        )
        return true
      }
    )
  })
})
