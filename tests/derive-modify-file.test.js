const dt = require('../')

describe('modify file', () => {
  beforeEach(() => {
    dt._init()
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
          /\/\/ comment\n\s*\/\*\* @type { import\(.*\)\.GEN } Generated \*\/\n\s*function simpleFn/
        )
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
          expect.stringMatching(
            /\/\/ comment 2\n\s*\/\*\* @type { import\(.*\)\.GEN } Generated \*\/\n\s*function simpleFn2\(/
          )
        )
        done()
      }
    })
  })
})
