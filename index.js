#!/usr/bin/env node

const dbg = (...args) =>
  process.env.DERIVE_TYPE_DEBUG ? console.log(...args) : {}

const { spawn } = require('child_process')
const os = require('os')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const DERIVE_TYPE_FOLDER =
  process.env.DERIVE_TYPE_FOLDER || path.join(os.tmpdir(), 'derive-type-gen')
// TODO: use symbols
const UNION = '___union'
const OPTION = '___option'
const IDENTIFIER = '___identifier'
const CACHED = '___cached'
const ORIGINAL = '___original'

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
  if (Array.isArray(shape)) {
    if (root) {
      let resGen = 'export type GEN = ('
      shape.forEach((s, idx) => {
        const optional = s && typeof s === 'object' && s[OPTION]
        resGen =
          resGen +
          `arg${idx}${optional ? '?' : ''}: ${shapeToTSType(
            s,
            false,
            cyclicShapes
          )}, `
      })
      resGen = resGen.slice(0, -2) + ') => any'
      let res = ''
      for (const [key, value] of cyclicShapes.entries()) {
        res = res + `type ${key} = ${value}\n`
      }
      return res + resGen
    } else {
      let res = '('
      for (const item of shape) {
        res = res + shapeToTSType(item, false, cyclicShapes) + '|'
      }
      res = res.slice(0, -1) + ')[]'
      if (shape[IDENTIFIER]) {
        cyclicShapes.set(shape[IDENTIFIER], res)
      }
      return res
    }
  }
  if (typeof shape === 'object' && OPTION in shape) {
    let res = shapeToTSType(shape[OPTION], false, cyclicShapes)
    if (shape[IDENTIFIER]) {
      cyclicShapes.set(shape[IDENTIFIER], res)
    }
    return res
  }
  if (typeof shape === 'object' && shape[UNION]) {
    let res = '('
    for (const u of shape[UNION]) {
      res = res + shapeToTSType(u, false, cyclicShapes) + '|'
    }
    res = res.slice(0, -1) + ')'
    if (shape[IDENTIFIER]) {
      cyclicShapes.set(shape[IDENTIFIER], res)
    }
    return res
  }
  if (typeof shape === 'object') {
    let res = '{'
    for (const key in shape) {
      if (key === IDENTIFIER) continue
      const quote = root ? '' : '"'
      res =
        res +
        `${quote}${key}${quote}${
          typeof shape[key] === 'object' && OPTION in shape[key] ? '?' : ''
        }: ${shapeToTSType(shape[key], false, cyclicShapes)}, `
    }
    res = res.slice(0, -2) + '}'
    if (shape[IDENTIFIER]) {
      cyclicShapes.set(shape[IDENTIFIER], res)
    }
    return res
  }
  if (typeof shape === 'string' && shape.startsWith('cyclic:')) {
    let res = shape.replace(/^cyclic:/, '')
    return res
  }
  return shape
}

function merge(root, obj) {
  for (const key in root) {
    if (!(key in obj)) {
      if (typeof key !== 'string' || !key.startsWith('cyclic:'))
        root[key] = { [OPTION]: root[key] }
    }
  }
  for (const key in obj) {
    if (!(key in root)) {
      if (typeof key === 'string' && key.startsWith('cyclic:'))
        root[key] = obj[key]
      else root[key] = { [OPTION]: obj[key] }
    } else if (typeof root[key] === 'string') {
      if (obj[key] === root[key]) {
        // nothing to do
      } else {
        root[key] = { [UNION]: [root[key], obj[key]] }
      }
    } else if (typeof root[key] === 'object')
      if (!root[UNION]) {
        if (typeof obj[key] === 'object') {
          if (Array.isArray(obj[key])) {
            if (Array.isArray(root[key])) {
              const combined = [...root[key], ...obj[key]]
              const rootObj = combined.find((c) => c && typeof c === 'object')
              const res = []
              for (const c of combined) {
                if (c === rootObj) res.push(c)
                else if (c && typeof c === 'object') merge(rootObj, c)
                else res.push(c)
              }
              root[key] = [...new Set(res)]
            } else {
              root[key] = { [UNION]: [root[key], obj[key]] }
            }
          } else if (Array.isArray(root[key])) {
            root[key] = { [UNION]: [root[key], obj[key]] }
          } else merge(root[key], obj[key])
        } else {
          root[key] = { [UNION]: [root[key], obj[key]] }
        }
      } else {
        if (typeof obj[key] === 'string') {
          if (root[key][UNION].includes(obj[key])) {
            // nothing to do
          } else {
            // todo: merge, check for object
            root[key][UNION].push(obj[key])
          }
        } else {
          //  two objects need to be merged, can also be array
          const rootObj = root[key][UNION].find(
            (u) => u && typeof u === 'object'
          )
          if (rootObj) {
            merge(rootObj, obj[key])
          } else {
            root[key][UNION].push(obj[key])
          }
        }
      }
  }
}

function _main(cb) {
  dbg('### Generating types')
  const files = fs.readdirSync(DERIVE_TYPE_FOLDER)
  const modLog = []
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
    dbg('unique:', JSON.stringify(unique))
    const root = unique[0]
    for (let i = 1; i < unique.length; i++) {
      merge(root, unique[i])
    }
    dbg('merged:', JSON.stringify(root))
    const res = shapeToTSType(root, true)
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
    let rmLine = 0
    const adjustedLine = modLog.reduce((p, c) => {
      if (p > c) return p + 1
      return p
    }, meta.line)
    if (adjustedLine >= 3 && fileCont[adjustedLine - 3].startsWith('/**'))
      rmLine = 1
    fileCont.splice(adjustedLine - 2 - rmLine, rmLine, typeDef)
    if (rmLine === 0) modLog.push(adjustedLine - 2)
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
  const runtimeArgs = process.argv.slice(2)
  if (runtimeArgs[0] === '--version' || runtimeArgs[0] === '-v') {
    console.log('Derive-Type Version 0.0.5')
    return
  }
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

function genId() {
  return 'CYCLE' + crypto.randomBytes(8).toString('hex')
}

function setIdentifier(obj) {
  if (!obj) return obj
  if (Array.isArray(obj)) return obj.forEach((o) => setIdentifier(o))
  if (typeof obj === 'object') {
    if (obj[ORIGINAL]) obj[IDENTIFIER] = obj[ORIGINAL][IDENTIFIER]
    for (const key in obj) {
      if (key === IDENTIFIER) continue
      setIdentifier(obj[key])
    }
    return
  }
  return obj
}

function argumentToShape(arg, root, objCache = new WeakSet()) {
  if (arg === null) return 'null'
  if (arg === undefined) return 'undefined'
  if (typeof arg === 'number') return 'number'
  if (typeof arg === 'boolean') return 'boolean'
  if (typeof arg === 'string') return 'string'
  if (Array.isArray(arg)) {
    const rootObj = arg.find(
      (a) => a && typeof a === 'object' && !Array.isArray(a)
    ) // TODO: Array of Array
    const rootShape = rootObj && argumentToShape(rootObj, false, objCache)
    const res = []
    for (const a of arg) {
      if (rootObj && a && typeof a === 'object' && !Array.isArray(a)) {
        if (rootObj === a) res.push(rootShape)
        else {
          merge(rootShape, argumentToShape(a, false, objCache))
        }
      } else {
        res.push(argumentToShape(a, false, objCache))
      }
    }
    if (root) {
      setIdentifier(res)
      return res // do not merge for arguments
    }
    const result = [...new Set(res)]
    return result
  }
  if (typeof arg === 'object') {
    objCache.add(arg)
    const shape = {}
    const sortedKeys = []
    for (key in arg) sortedKeys.push(key)
    sortedKeys.filter((k) => k !== IDENTIFIER).sort()
    for (const key of sortedKeys) {
      const sub = arg[key]
      if (sub && typeof sub === 'object' && objCache.has(sub)) {
        const id = sub[IDENTIFIER] || genId()
        if (!sub[IDENTIFIER]) {
          sub[IDENTIFIER] = id
        }
        shape[key] = 'cyclic:' + id
      } else {
        shape[key] = argumentToShape(arg[key], false, objCache)
      }
    }
    // Store the original object because it might be enriched with IDENTIFIER
    Object.defineProperty(shape, ORIGINAL, { value: arg, enumerable: false })
    return shape
  }
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
  const [_x, _y, locationInfo] = stack.split('\n')[2].trim().split(' ')
  const argShapes = argumentToShape(args, true)
  const filePath = path.join(DERIVE_TYPE_FOLDER, encodeToFilename(locationInfo))
  dbg('Appending file', filePath)

  dbg('shapes', argShapes)
  fs.appendFileSync(filePath, JSON.stringify(argShapes) + '\n')
}

// For debugging/tests
deriveType._main = _main
deriveType._init = initializeFilesystem

// TODO:
// - cycle detection objects
// - file locks for concurrent append
// - dedupe
// - multiline functions
// - multiple functions at once

module.exports = deriveType
