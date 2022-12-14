const dt = require('../')

describe('modify file', () => {
  beforeEach(() => {
    dt._init()
  })

  test('single var but unsupported', (done) => {
    // comment
    const x = 'foo'
    dt(x)

    dt._main(({ res, typeDef, modifiedFile }) => {
      expect(res).toEqual('export type GEN = (arg0: string) => any')
      expect(typeDef).toEqual(
        expect.stringMatching(
          /^\/\*\* @type { import\(.*\)\.GEN } Generated \*\//
        )
      )
      expect(modifiedFile).toEqual(
        expect.stringMatching(
          /\/\/ comment\n\s*\/\*\* @type { import\(.*\)\.GEN } Generated \*\/\n\s*const x/
        )
      )
      done()
    })
  })

  test('single function', (done) => {
    // comment
    function simpleFn(x) {
      dt(x)
    }
    simpleFn(1)

    dt._main(({ res, typeDef, modifiedFile }) => {
      expect(res).toEqual('export type GEN = (arg0: number) => any')
      expect(typeDef).toEqual(
        expect.stringMatching(
          /^\/\*\* @type { import\(.*\)\.GEN } Generated \*\//
        )
      )
      expect(modifiedFile).toEqual(
        expect.stringMatching(
          /\/\/ comment\n\s*\/\*\* @type { import\(.*\)\.GEN } Generated \*\/\n\s*function simpleFn/ // type annotation
        )
      )
      expect(modifiedFile).toEqual(
        expect.stringMatching(/function simpleFn\(x\) {\n\s*}/) // removed dt(x) call in function
      )
      done()
    })
  })

  test('multi-line function', (done) => {
    // comment
    function multiLineFn(x) {
      dt(x)
    }
    multiLineFn(1)

    dt._main(({ res, typeDef, modifiedFile }) => {
      expect(res).toEqual('export type GEN = (arg0: number) => any')
      expect(typeDef).toEqual(
        expect.stringMatching(
          /^\/\*\* @type { import\(.*\)\.GEN } Generated \*\//
        )
      )
      expect(modifiedFile).toEqual(
        expect.stringMatching(
          /\/\/ comment\n\s*\/\*\* @type { import\(.*\)\.GEN } Generated \*\/\n\s*function multiLineFn/ // type annotation
        )
      )
      expect(modifiedFile).toEqual(
        expect.stringMatching(/function multiLineFn\(x\)\s*{\n\s*}/) // removed dt(x) call in function
      )
      done()
    })
  })

  test('multiple functions', (done) => {
    // comment 1
    function simpleFn(x) {
      dt(x)
    }
    simpleFn(1)

    // comment 2
    function simpleFn2(x) {
      dt(x)
    }
    simpleFn2(1)

    let count = 0
    dt._main(({ res, typeDef, modifiedFile }) => {
      expect(res).toEqual('export type GEN = (arg0: number) => any')
      expect(typeDef).toEqual(
        expect.stringMatching(
          /^\/\*\* @type { import\(.*\)\.GEN } Generated \*\//
        )
      )

      count = count + 1
      if (count === 2) {
        expect(modifiedFile).toEqual(
          expect.stringMatching(
            /\/\/ comment 1\n\s*\/\*\* @type { import\(.*\)\.GEN } Generated \*\/\n\s*function simpleFn\(/
          )
        )

        expect(modifiedFile).toEqual(
          expect.stringMatching(/function simpleFn\(x\) {\n\s*}/) // removed dt(x) call in function
        )

        expect(modifiedFile).toEqual(
          expect.stringMatching(
            /\/\/ comment 2\n\s*\/\*\* @type { import\(.*\)\.GEN } Generated \*\/\n\s*function simpleFn2\(/
          )
        )

        expect(modifiedFile).toEqual(
          expect.stringMatching(/function simpleFn2\(x\) {\n\s*}/) // removed dt(x) call in function
        )
        done()
      }
    })
  })
})
