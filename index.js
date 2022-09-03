#!/usr/bin/env node

const dbg = (...args) =>
  process.env.DERIVE_TYPE_DEBUG ? console.log(...args) : {}

const { spawn } = require('child_process')
const os = require('os')
const path = require('path')
const fs = require('fs')

const SHAPE = {
  plain: 'plain',
  obj: 'obj',
  array: 'array',
  union: 'union',
}

const DERIVE_TYPE_FOLDER =
  process.env.DERIVE_TYPE_FOLDER || path.join(os.tmpdir(), 'derive-type-gen')

function initializeFilesystem() {
  dbg('### Initialize')
  if (!fs.existsSync(DERIVE_TYPE_FOLDER)) {
    dbg('Creating directory', DERIVE_TYPE_FOLDER)
    fs.mkdirSync(DERIVE_TYPE_FOLDER)
  }
  const files = fs.readdirSync(DERIVE_TYPE_FOLDER)
  files.forEach((file) => {
    const filePath = path.join(DERIVE_TYPE_FOLDER, file)
    dbg('Deleting file', filePath)
    fs.unlinkSync(filePath)
  })
}

function shapeToTSType(shape, root, cyclicShapes = new Map()) {
  if (shape.kind === SHAPE.array) {
    let res = '('
    for (const item of shape.value) {
      res = res + shapeToTSType(item, false, cyclicShapes) + '|'
    }
    if (!shape.value.length) res = res + 'any|'
    res = res.slice(0, -1) + ')[]'
    if (shape.id) {
      cyclicShapes.set(shape.id, res)
    }
    return res
  }
  if (shape.kind === SHAPE.union) {
    let res = '('
    for (const u of shape.value) {
      res = res + shapeToTSType(u, false, cyclicShapes) + '|'
    }
    res = res.slice(0, -1) + ')'
    if (!shape.value.length) res = 'any'
    if (shape.id) {
      cyclicShapes.set(shape.id, res)
    }
    return res
  }
  if (shape.kind === SHAPE.obj) {
    if (root) {
      let resGen = 'export type GEN = ('
      let hasKeys = false
      for (const key in shape.value) {
        hasKeys = true
        // TODO
        resGen =
          resGen +
          `${key}${shape.value[key].optional ? '?' : ''}: ${shapeToTSType(
            shape.value[key],
            false,
            cyclicShapes
          )}, `
      }
      if (hasKeys) resGen = resGen.slice(0, -2)
      resGen = resGen + ') => any'
      let res = ''
      for (const [key, value] of cyclicShapes.entries()) {
        res = res + `type ${key} = ${value}\n`
      }
      return res + resGen
    } else {
      // array or obj?
      let res = '{'
      let hasKeys = false
      for (const key in shape.value) {
        hasKeys = true
        const quote = root ? '' : '"'
        res =
          res +
          `${quote}${key}${quote}${
            shape.value[key].optional ? '?' : ''
          }: ${shapeToTSType(shape.value[key], false, cyclicShapes)}, `
      }
      if (hasKeys) res = res.slice(0, -2)
      res = res + '}'
      if (shape.id) {
        cyclicShapes.set(shape.id, res)
      }
      return res
    }
  }
  if (shape.kind === SHAPE.plain && shape.value.startsWith('cyclic:')) {
    let res = shape.value.replace(/^cyclic:/, '')
    if (shape.id) {
      cyclicShapes.set(shape.id, res)
    }
    return res
  }
  if (shape.id) {
    cyclicShapes.set(shape.id, res)
  }
  return shape.value
}

function mergeArray(arr) {
  if (!arr.length) return [{ kind: SHAPE.plain, value: 'any' }]

  // if there's an `any` element, the whole array is of type `any`)
  let combinedInnerArray

  if (
    arr.length === 1 &&
    arr.some((x) => x.kind === SHAPE.plain && x.value === 'any')
  )
    return [{ kind: SHAPE.plain, value: 'any' }]

  return arr
    .flatMap((x) => {
      if (x.kind === SHAPE.plain && x.value === 'any') return []
      return x.kind === SHAPE.union ? x.value : [x] // unfold unions
    })
    .reduce((r, c) => {
      if (
        c.kind === SHAPE.plain &&
        r.some((x) => x.kind === SHAPE.plain && x.value === c.value)
      )
        return r
      if (c.kind === SHAPE.obj) {
        const existingObjIdx = r.findIndex((x) => x.kind === SHAPE.obj)
        if (existingObjIdx < 0) {
          r.push(c)
          return r
        }
        const existingObj = r[existingObjIdx]
        r[existingObjIdx] = merge(c, existingObj)
        return r
      }
      if (c.kind === SHAPE.array) {
        // TODO: Must be made recursive?
        if (!combinedInnerArray) {
          combinedInnerArray = { kind: SHAPE.array, value: mergeArray(c.value) }
          r.push(combinedInnerArray)
        } else {
          combinedInnerArray.value = mergeArray([
            ...combinedInnerArray.value,
            ...c.value,
          ])
        }
        return r
      }
      r.push(c)
      return r
    }, [])
}

function merge(root, other) {
  if (root.kind === SHAPE.plain && other.kind === SHAPE.plain) {
    if (root.value === other.value) return root
    return { kind: SHAPE.union, value: mergeArray([root, other]) }
  }
  if (root.kind === SHAPE.plain && other.kind !== SHAPE.plain) {
    return { kind: SHAPE.union, value: mergeArray([root, other]) }
  }
  if (root.kind !== SHAPE.plain && other.kind === SHAPE.plain) {
    return merge(other, root) // symmetrical case
  }
  if (root.kind === SHAPE.obj && other.kind === SHAPE.obj) {
    const merged = {}
    for (const key in root.value) {
      if (!(key in other.value)) {
        root.value[key].optional = true
        merged[key] = root.value[key]
      } else {
        merged[key] = merge(root.value[key], other.value[key])
      }
    }
    for (const key in other.value) {
      if (!(key in root.value)) {
        other.value[key].optional = true
        merged[key] = other.value[key]
      }
    }
    return { kind: SHAPE.obj, value: merged }
  }
  if (root.kind === SHAPE.array && other.kind === SHAPE.array) {
    return {
      kind: SHAPE.array,
      value: mergeArray([...root.value, ...other.value]),
    }
  }
  if (root.kind === SHAPE.union && other.kind === SHAPE.union) {
    return {
      kind: SHAPE.union,
      value: mergeArray([...root.value, ...other.value]),
    }
  }
  if (root.kind === SHAPE.union && other.kind !== SHAPE.union) {
    return {
      kind: SHAPE.union,
      value: mergeArray([...root.value, other]),
    }
  }
  if (root.kind !== SHAPE.union && other.kind === SHAPE.union) {
    return merge(other, root) // symmetrical case
  }
  const err = new Error('TODO: Invalid state detected')
  err.obj = [root, other]
  throw errr
}

function _main(cb) {
  dbg('### Generating types')
  const files = fs.readdirSync(DERIVE_TYPE_FOLDER)
  const lineDeletionLocations = new Map() // stores removals per file
  const cache = new Map() // speedup and needed for tests since we don't change the original test files
  files.forEach((file) => {
    const decoded = decodeFromFileName(file)
    const [fileName, line, column] = decoded
      .slice(1, decoded.length - 1)
      .split(':')
    const meta = { fileName, line: Number(line), column: Number(column) }
    dbg(meta)
    const filePath = path.join(DERIVE_TYPE_FOLDER, file)
    const content = fs.readFileSync(filePath, 'utf8').split('\n').slice(0, -1)
    const unique = [...new Set(content)].map((s) => JSON.parse(s))
    if (process.env.DERIVE_TYPE_DEBUG) dbg('unique:', JSON.stringify(unique))
    let merged = unique[0]
    for (let i = 1; i < unique.length; i++) {
      merged = merge(merged, unique[i])
    }
    if (process.env.DERIVE_TYPE_DEBUG) dbg('merged:', JSON.stringify(merged))
    const res = shapeToTSType(merged, true)
    dbg()
    dbg('####### Definition file #######')
    dbg(res)
    dbg('###############################')
    dbg()
    const typeDef = `/** @type { import("${filePath}").GEN } Generated */`

    const typeDefFilePath = filePath + '.d.ts'
    fs.writeFileSync(typeDefFilePath, res)
    const fileCont =
      cache.get(meta.fileName) ||
      fs.readFileSync(meta.fileName, 'utf8').split('\n')
    let hadTypeAnnotations = false
    if (!lineDeletionLocations.has(meta.fileName))
      lineDeletionLocations.set(meta.fileName, [])
    const adjustedLine = lineDeletionLocations
      .get(meta.fileName)
      .reduce((p, c) => {
        if (p > c) return p - 1
        return p
      }, meta.line)
    if (adjustedLine >= 3 && fileCont[adjustedLine - 3].startsWith('/**'))
      hadTypeAnnotations = true
    if (hadTypeAnnotations) {
      fileCont.splice(adjustedLine - 3, 1, typeDef) // replace existing type annotation
      fileCont.splice(adjustedLine - 1, 1) // remove derive-type function call
      lineDeletionLocations.get(meta.fileName).push(adjustedLine - 1) // effectively removed one line, remember location
    } else {
      fileCont.splice(adjustedLine - 2, 0, typeDef) // insert type annotation
      fileCont.splice(adjustedLine, 1) // remove derive-type function call
    }
    cache.set(meta.fileName, fileCont)
    const modifiedFile = fileCont.join('\n')
    if (!cb) fs.writeFileSync(meta.fileName, modifiedFile)
    if (cb) {
      cb({ typeDef, res, modifiedFile })
      return
    }
    dbg()
    dbg()
  })
}

function main() {
  const version = '0.0.995'
  const runtimeArgs = process.argv.slice(2)
  if (runtimeArgs[0] === '--version' || runtimeArgs[0] === '-v') {
    console.log('Derive-Type Version', version)
    return
  }
  dbg('Derive-Type Version', version)
  dbg('runtime arguments:', runtimeArgs)
  initializeFilesystem()

  const ls = spawn(runtimeArgs[0], runtimeArgs.slice(1), { stdio: 'inherit' })
  ls.on('close', (code) => {
    _main()
  })
}

if (require.main === module) {
  main()
}

function removeUnusedIds(obj) {
  if (obj.kind === SHAPE.obj) {
    if (obj.cache?.id) {
      if (obj.cache.hasReferences) obj.id = obj.cache.id
      delete obj.cache
    }
    for (const key in obj.value) {
      removeUnusedIds(obj.value[key])
    }
  }
  delete obj.cache
  if (obj.kind === SHAPE.array) {
    return obj.value.forEach((o) => removeUnusedIds(o))
  }
  return
}

function getSortedKeys(obj) {
  const keys = []
  for (const key in obj) keys.push(key)
  keys.sort()
  return keys
}

function argumentToShape(arg, root, objCache = new Map(), path = '') {
  if (typeof arg === 'object' && !objCache.has(arg)) {
    objCache.set(arg, { id: path, hasReferences: false })
  }
  if (arg === null) return { kind: SHAPE.plain, value: 'null' }
  if (arg === undefined) return { kind: SHAPE.plain, value: 'undefined' }
  if (typeof arg === 'function') return { kind: SHAPE.plain, value: 'Function' }
  if (typeof arg === 'number') return { kind: SHAPE.plain, value: 'number' }
  if (typeof arg === 'boolean') return { kind: SHAPE.plain, value: 'boolean' }
  if (typeof arg === 'string') return { kind: SHAPE.plain, value: 'string' }
  if (typeof arg === 'symbol') return { kind: SHAPE.plain, value: 'symbol' }
  if (typeof arg === 'bigint') return { kind: SHAPE.plain, value: 'bigint' }
  if (arg instanceof Date) return { kind: SHAPE.plain, value: 'Date' }
  if (Array.isArray(arg)) {
    const res = {
      kind: SHAPE.array,
      value: mergeArray(
        arg.map(
          (a, idx) => argumentToShape(a, false, objCache, path + '$' + idx) // remove forbidden type characters
        )
      ),
      cache: objCache.get(arg),
    }
    return res
  }
  if (typeof arg === 'object') {
    const shape = {}
    // TODO: TypeScripty loop
    const sortedKeys = getSortedKeys(arg)
    for (const key of sortedKeys) {
      const sub = arg[key]
      if (sub && typeof sub === 'object' && objCache.has(sub)) {
        const cache = objCache.get(sub)
        cache.hasReferences = true
        shape[key] = { kind: SHAPE.plain, value: cache.id }
      } else {
        shape[key] = argumentToShape(
          arg[key],
          false,
          objCache,
          `${path}$${key.replace(/\./g, '')}`
        )
      }
    }
    const res = { kind: SHAPE.obj, value: shape, cache: objCache.get(arg) }
    if (root) {
      removeUnusedIds(res)
    }
    return res
  }
  const err = new Error('unkown type detected' + typeof arg)
  err.arg = arg
  throw err
}

function encodeToFilename(obj) {
  return Buffer.from(obj).toString('base64')
}

function decodeFromFileName(fileName) {
  return Buffer.from(fileName, 'base64').toString()
}

function deriveType(...arg) {
  const args = Array.from(arg)
  const stack = new Error().stack
  const locationInfo = stack.split('\n')[2].match(/\(.*\)/)[0]
  const argsObj = {}
  args.forEach((arg, idx) => {
    argsObj['arg' + idx] = arg
  })
  const argShapes = argumentToShape(argsObj, true)
  const filePath = path.join(DERIVE_TYPE_FOLDER, encodeToFilename(locationInfo))
  dbg('Appending file', filePath)

  dbg('shapes', argShapes)
  fs.appendFileSync(filePath, JSON.stringify(argShapes) + '\n')
}

// For debugging/tests
deriveType._main = _main
deriveType._init = initializeFilesystem

// TODO:
// - file locks for concurrent append
// - multiline functions
// - non-function types

module.exports = deriveType
