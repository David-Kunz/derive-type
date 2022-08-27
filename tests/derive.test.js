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

    test('function', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn(() => {
        console.log('foo')
      })

      dt._main(({ res }) => {
        expect(res).toEqual('export type GEN = (arg0: Function) => any')
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

    test('array of numbers', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn([1, 2, 3])

      dt._main(({ res }) => {
        expect(res).toEqual('export type GEN = (arg0: (number)[]) => any')
        done()
      })
    })

    test('empty array', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn([])

      dt._main(({ res }) => {
        expect(res).toEqual('export type GEN = (arg0: (any)[]) => any')
        done()
      })
    })

    test('object with empty array', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn({ a: [] })

      dt._main(({ res }) => {
        expect(res).toEqual('export type GEN = (arg0: {"a": (any)[]}) => any')
        done()
      })
    })

    test('object with empty optional array', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn({})

      dt._main(({ res }) => {
        expect(res).toEqual('export type GEN = (arg0: {}) => any')
        done()
      })
    })

    test('multiple empty array', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn([])
      simpleFn([])

      dt._main(({ res }) => {
        expect(res).toEqual('export type GEN = (arg0: (any)[]) => any')
        done()
      })
    })

    test('empty optional array', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn()
      simpleFn([])

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0: (undefined|(any)[])) => any'
        )
        done()
      })
    })

    test('array of numbers or strings', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn([1, 2, 'foo', 'bar'])

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0: (number|string)[]) => any'
        )
        done()
      })
    })

    test('array of objects', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn([{ foo: 1 }, { foo: 2 }])

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0: ({"foo": number})[]) => any'
        )
        done()
      })
    })

    test('array of objects with optional values', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn([{ foo: 1 }, { foo: 2, optional: true }])

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0: ({"foo": number, "optional"?: boolean})[]) => any'
        )
        done()
      })
    })

    test('array of different objects', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn([{ foo: 1 }, { bar: 'xxx' }])

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0: ({"bar"?: string, "foo"?: number})[]) => any'
        )
        done()
      })
    })

    test('array of different nested objects', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn([
        { foo: 1, nested: { b: 'yyy' } },
        { foo: 1, nested: { a: 'xxx' } },
      ])

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0: ({"foo": number, "nested": {"a"?: string, "b"?: string}})[]) => any'
        )
        done()
      })
    })

    test('array of objects and primitive values', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn(['primitive', { bar: 'xxx' }])

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0: (string|{"bar": string})[]) => any'
        )
        done()
      })
    })

    test('multiple invocation array of numbers', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn([1, 2, 3])
      simpleFn([4, 5, 6])

      dt._main(({ res }) => {
        expect(res).toEqual('export type GEN = (arg0: (number)[]) => any')
        done()
      })
    })

    test('multiple invocation array of objects', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn([{ foo: 'bar' }])
      simpleFn([{ foo: 'baz' }])

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0: ({"foo": string})[]) => any'
        )
        done()
      })
    })

    test('multiple invocation array of different objects', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn([{ foo: 'bar' }])
      simpleFn([{ foo: 'baz', optional: true }])

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0: ({"foo": string, "optional"?: boolean})[]) => any'
        )
        done()
      })
    })

    test('multiple invocation with multiple entries for array of different objects', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn([{ foo: 'bar' }, { foo: 'xx' }])
      simpleFn([
        { foo: 'baz', optional: true },
        { foo: 'yy', optional: false },
      ])

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0: ({"foo": string, "optional"?: boolean})[]) => any'
        )
        done()
      })
    })

    test('multiple invocation with different multiple entries for array of different objects', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn([{ foo: 'bar' }, { xxx: 'xxx' }])
      simpleFn([
        { foo: 'baz', optional: true },
        { yyy: 'yyy', optional: false },
      ])

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0: ({"yyy"?: string, "optional"?: boolean, "foo"?: string, "xxx"?: string})[]) => any'
        )
        done()
      })
    })

    test('arrays of arrays with primitive values', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn([['a', 'b']])

      dt._main(({ res }) => {
        expect(res).toEqual('export type GEN = (arg0: ((string)[])[]) => any')
        done()
      })
    })

    test('multiple invocations with arrays of arrays with primitive values', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn([['a', 'b']])
      simpleFn([['c', 'd']])

      dt._main(({ res }) => {
        expect(res).toEqual('export type GEN = (arg0: ((string)[])[]) => any')
        done()
      })
    })

    test('arrays of arrays with objects', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn([[{ foo: 'x' }, { foo: 'y' }]])

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0: (({"foo": string})[])[]) => any'
        )
        done()
      })
    })

    test('multiple invocations with arrays of arrays with objects', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn([[{ foo: 'x' }, { foo: 'y' }]])
      simpleFn([[{ foo: 'a' }, { foo: 'b' }]])

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0: (({"foo": string})[])[]) => any'
        )
        done()
      })
    })

    test('arrays of arrays with different objects', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn([[{ foo: 'x' }, { foo: 'y', optional: true }]])

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0: (({"foo": string, "optional"?: boolean})[])[]) => any'
        )
        done()
      })
    })

    test('multiple invocations with arrays of arrays with objects', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn([[{ foo: 'a' }, { foo: 'b' }]])
      simpleFn([[{ foo: 'x' }, { foo: 'y', optional: true }]])

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0: (({"foo": string, "optional"?: boolean})[])[]) => any'
        )
        done()
      })
    })

    test('arrays of arrays with different union objects', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn([[{ foo: 'x' }, { foo: 'y', optional: true }, 'xxx']])

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0: (({"foo": string, "optional"?: boolean}|string)[])[]) => any'
        )
        done()
      })
    })

    test('multiple invocations with arrays of arrays with different union objects', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn([[{ foo: 'x' }, { foo: 'y', optional: true }, 'xxx']])
      simpleFn([[true]])
      simpleFn(true)

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0: (boolean|(({"foo": string, "optional"?: boolean}|string|boolean)[])[])) => any'
        )
        done()
      })
    })

    test('cyclic objects', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      const obj = { a: 1 }
      obj.b = obj
      simpleFn(obj)

      dt._main(({ res }) => {
        expect(res).toEqual(
          expect.stringMatching(/{"a": number, "b": CYCLE.*}/)
        )
        done()
      })
    })

    test('nested cyclic objects', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      const obj = { a: 1 }
      obj.b = { c: obj }
      simpleFn(obj)

      dt._main(({ res }) => {
        expect(res).toEqual(expect.stringMatching(/"c": CYCLE/))
        done()
      })
    })

    test('several nested cyclic objects', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      const obj = { a: 1 }
      obj.b = { c: obj }
      obj.d = obj.b
      simpleFn(obj)

      dt._main(({ res }) => {
        expect(res).toEqual(expect.stringMatching(/"c": CYCLE/))
        expect(res).toEqual(expect.stringMatching(/"d": CYCLE/))
        done()
      })
    })

    test('multiple invocations for union', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn('a')
      simpleFn(123)
      simpleFn(true)

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0: (boolean|string|number)) => any'
        )
        done()
      })
    })
    test('multiple invocations for optional union', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn('a')
      simpleFn(123)
      simpleFn(true)
      simpleFn({ a: 1, b: 'foo' })
      simpleFn({ a: 1 })

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0: (boolean|string|number|{"a": number, "b"?: string})) => any'
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

    test('2 numbers', (done) => {
      function simpleFn(x, y) {
        dt(x, y)
      }
      simpleFn(1, 2)

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0: number, arg1: number) => any'
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
