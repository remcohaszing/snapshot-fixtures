# snapshot-fixtures

[![github actions](https://github.com/remcohaszing/snapshot-fixtures/actions/workflows/ci.yaml/badge.svg)](https://github.com/remcohaszing/snapshot-fixtures/actions/workflows/ci.yaml)
[![codecov](https://codecov.io/gh/remcohaszing/snapshot-fixtures/branch/main/graph/badge.svg)](https://codecov.io/gh/remcohaszing/snapshot-fixtures)
[![npm version](https://img.shields.io/npm/v/snapshot-fixtures)](https://www.npmjs.com/package/snapshot-fixtures)
[![npm downloads](https://img.shields.io/npm/dm/snapshot-fixtures)](https://www.npmjs.com/package/snapshot-fixtures)

Snapshot fixtures for [`node:test`](https://nodejs.org/api/test.html).

## Table of Contents

- [Installation](#installation)
- [When to use this?](#when-to-use-this)
- [Usage](#usage)
- [API](#api)
  - [`assertEqual(actual, expected[, options])`](#assertequalactual-expected-options)
  - [`testFixturesDirectory(options)`](#testfixturesdirectoryoptions)
  - [`Test`](#test)
- [Compatibility](#compatibility)
- [License](#license)

## Installation

```sh
npm install snapshot-fixtures
```

## When to use this?

This package exposes a function for creating tests based on a directory containing test fixtures.
This is useful if you want to run tests based on a string input and a string output, especially for
multiline content.

## Usage

Let’s say you have the following project structure:

```
my-project/
├── fixtures/
│   ├── fixture-1/
│   │   ├── input.txt
│   │   ├── expected-1.txt
│   │   ├── expected-2.txt
│   │   └── options.json
│   └── fixture-2/
│       ├── input.txt
│       ├── expected-1.txt
│       ├── expected-2.txt
│       └── options.js
└── test/
    └── fixtures.test.js
```

Then `src/fixtures.test.js` could look like this:

```typescript
import { fn } from 'my-project'
import { testFixturesDirectory } from 'snapshot-fixtures'

testFixturesDirectory({
  directory: new URL('../fixtures', import.meta.url),
  tests: {
    'expected-1.txt'(file, options) {
      return fn(file, options)
    },

    'expected-2.txt'(file, options) {
      return fn(file, options, 'additional options')
    }
  }
})
```

This test asserts that the contents of the `expected-1.txt` and `expected-2.txt` tests of each
fixture match the respective return value of matching test function.

## API

### `assertEqual(actual, expected[, options])`

Assert two strings are equal.

If the strings are not equal, an assertion error will be thrown. This assertion error contains a
pretty diff of the two strings.

#### Arguments

- `actual` (`string`) — The actual value that was produced.
- `expected` (`string`) — The value that was expected.
- `options` (`object`, optional) — An object with additional options. The following options are
  supported:
  - `url` (`string` | `URL`) — The file URL to include in the assertion error if `expected` is not
    equal to `actual`.

### `testFixturesDirectory(options)`

Create a test suite for a fixtures directory based on
[`node:test`](https://nodejs.org/api/test.html). A fixtures directory is a directory that contains
other directories. For each of these directories a nested test suite is created. For each of these
nested test suites, a test is created based on the tests passed. Each test reads the input file,
uses the given test function to generate output, and compares it to the content of the expected
output file.

#### Options

- `directory` (`string` | `URL`) — The directory containing fixtures as a URL or URL string.
- `prettier` (`boolean`, optional) — If true, format the generated value with Prettier. (Default:
  false)
- `tests` (`object`) — A mapping of test name to a [fixture test](#test).
- `write` (`boolean`) — If true, overwrite the expected content with the actual content. In CI, the
  output is never written. (Default: false)

### `Test`

A test to run, either as a fixture test object, or as a generate function. The generate function
takes a [`VFile`](https://github.com/vfile/vfile) as input, which is read from the `input` file and
return a string that should match the expected output. A second argument `options` can be accepted.
This may contain the options of the fixture. These options are read from the `options.cjs`,
`options.js`, `options.json` or `options.mjs` file in the fixture directory.

A test may be an object with the `generate` and optional `input`, `expected`, and `ignore`
properties. In this case `input` determines which input file to read, `generate` serves as the
generate function, and `expected` refers to the expected output file. If `ignore` is true, the
result is written, but assertion failures are ignored.

## Compatibility

This project is compatible with Node.js 16 or greater.

## License

[MIT](LICENSE.md) © [Remco Haszing](https://github.com/remcohaszing)
