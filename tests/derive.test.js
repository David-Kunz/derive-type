const dt = require('../')

describe('derive types', () => {
  beforeEach(() => {
    dt._init()
  })

  describe('arity 1', () => {
    test('number', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn(1)

      dt._main(({ res, typeDef }) => {
        expect(res).toEqual('export type GEN = (arg0:number) => any')
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
        expect(res).toEqual('export type GEN = (arg0:string) => any')
        done()
      })
    })

    test('boolean', (done) => {
      function simpleFn(x) {
        dt(x)
      }
      simpleFn(true)

      dt._main(({ res }) => {
        expect(res).toEqual('export type GEN = (arg0:boolean) => any')
        done()
      })
    })
  })

  describe('arity 2', () => {
    test('2 number,string,boolean', (done) => {
      function simpleFn(x, y, z) {
        dt(x, y, z)
      }
      simpleFn(1, 'foo', true)

      dt._main(({ res }) => {
        expect(res).toEqual(
          'export type GEN = (arg0:number,arg1:string,arg2:boolean) => any'
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
          'export type GEN = (arg0:number,arg1:string,arg2:boolean) => any'
        )
        done()
      })
    })
  })
})
