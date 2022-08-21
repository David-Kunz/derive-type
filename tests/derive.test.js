const dt = require('../')

describe('derive types', () => {
  beforeEach(() => {
    dt._init()
  })

  describe('unary functions with single invocation', () => {
    test('number', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn(1)

      dt._main(({ res, typeDef }) => {
        expect(res).toEqual('export type GEN = (arg0: number) => any')
        expect(typeDef).toEqual(
          expect.stringMatching(
            /^\/\*\* @type { import\(.*\)\.GEN } Generated \*\//
          )
        )
        done()
      })
    })

    test('string', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn('foo')

      dt._main(({ res }) => {
        expect(res).toEqual('export type GEN = (arg0: string) => any')
        done()
      })
    })

    test('boolean', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn(true)

      dt._main(({ res }) => {
        expect(res).toEqual('export type GEN = (arg0: boolean) => any')
        done()
      })
    })

    test('object', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn({ a: 1, b: 'foo', c: true })

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0: {"a": number, "b": string, "c": boolean}) => any'
        )
        done()
      })
    })

    test('nested object', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn({ a: { a1: 1, a2: 'bla', a3: true }, b: 'foo', c: true })

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0: {"a": {"a1": number, "a2": string, "a3": boolean}, "b": string, "c": boolean}) => any'
        )
        done()
      })
    })
  })

  describe('unary functions with multiple invocations', () => {
    test('number number', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn(1)
      simpleFn(2)

      dt._main(({ res }) => {
        expect(res).toEqual('export type GEN = (arg0: number) => any')
        done()
      })
    })

    test('number or string', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn(1)
      simpleFn('foo')

      dt._main(({ res }) => {
        expect(res).toEqual('export type GEN = (arg0: (number|string)) => any')
        done()
      })
    })

    test('number or boolean', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn(1)
      simpleFn(true)

      dt._main(({ res }) => {
        expect(res).toEqual('export type GEN = (arg0: (number|boolean)) => any')
        done()
      })
    })

    test('number or object', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn(1)
      simpleFn({ a: 'foo' })

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0: (number|{"a": string})) => any'
        )
        done()
      })
    })

    test('two same objects', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn({ a: 'foo' })
      simpleFn({ a: 'bar' })

      dt._main(({ res }) => {
        expect(res).toEqual('export type GEN = (arg0: {"a": string}) => any')
        done()
      })
    })

    test('two same objects with subsets', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn({ a: 'foo', b: 1 })
      simpleFn({ a: 'bar' })

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0: {"a": string, "b"?: number}) => any'
        )
        done()
      })
    })

    test('two same objects with nested subsets', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn({ a: 'foo', b: { b1: 'foo', b2: 1 } })
      simpleFn({ a: 'bar', b: { b1: 'bar' } })

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0: {"a": string, "b": {"b1": string, "b2"?: number}}) => any'
        )
        done()
      })
    })

    test('optional parameters', (done) => {
      function simpleFn(x, y) {
        dt(...arguments)
      }
      simpleFn('foo', 1)
      simpleFn('baz')

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0: string, arg1?: number) => any'
        )
        done()
      })
    })
  })

  describe('functions with multiple arguments and single invocation', () => {
    test('2 number,string,boolean', (done) => {
      function simpleFn(x, y, z) {
        dt(x, y, z)
      }
      simpleFn(1, 'foo', true)

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0: number, arg1: string, arg2: boolean) => any'
        )
        done()
      })
    })

    test('arguments 2 number,string,boolean', (done) => {
      function simpleFn(x, y, z) {
        dt(...arguments)
      }
      simpleFn(1, 'foo', true)

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0: number, arg1: string, arg2: boolean) => any'
        )
        done()
      })
    })
  })
})
