# Derive Type

A simple function to generate types based on function invocations.

## Installation

```bash
npm i derive-type
```

## Simple Example

Original source code:

```js
// main.js

function myFunction(x, y) {
  console.log(x, y)
}

myFunction(1, 2)
```

Add this function call at the top of your function body:

```js
// main.js

function myFunction(x, y) {
  require('derive-type')(...arguments) // <- ADD THIS
  console.log(x, y)
}

myFunction(1, 2)
```

Then invoke the binary with the code to trigger the function invocations:

```bash
npx derive-type node main.js
```

This will generate the [TypeScript](https://www.typescriptlang.org/) definition and insert the [JSDoc](https://jsdoc.app/) snippet

```js
// main.js

/** @type { import("/var/folders/ls/xxxx/T/derive-type-gen/KC9Vc2Vycy9kMDY1MDIzL3Byb2plY3RzL0Rldk9uRHV0eS9kZXJpdmUtdHlwZS10ZXN0L3Rlc3QuanM6NDoyNSk=").GEN } Generated */
function myFunction(x, y) {
  require('derive-type')(...arguments) // <- ADD THIS
  // now you know that `x` and `y` are of type `number`
  console.log(x, y)
}

myFunction(1, 2)
```

## Notes

- The function invocations don't need to be in the same file, usally they are based on tests:
  ```bash
  npx derive-type npm test
  ```
- The generated types are based on the merged input of all function invocations.
- The generated types are located in `os.tmpdir()`, this can be changed through the environment variable `DERIVE_TYPE_FOLDER`.
- Debugging output can be enabled by setting the environment variable `DERIVE_TYPE_DEBUG` to true.
