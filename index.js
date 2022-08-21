#!/usr/bin/env node

const dbg = (...args) =>
  process.env.DERIVE_TYPE_DEBUG ? console.log(...args) : {}

const { exec } = require('child_process')
const os = require('os')
const path = require('path')
const fs = require('fs')

const DERIVE_TYPE_GEN_FOLDER =
  process.env.DERIVE_TYPE_FOLDER || path.join(os.tmpdir(), 'derive-type-gen')
const UNION = '___union'
const OPTION = '___option'

function initializeFilesystem() {
  dbg('### Initialize')
  if (!fs.existsSync(DERIVE_TYPE_GEN_FOLDER)) {
    dbg('Creating directory', DERIVE_TYPE_GEN_FOLDER)
    fs.mkdirSync(DERIVE_TYPE_GEN_FOLDER)
  }
  const files = fs.readdirSync(DERIVE_TYPE_GEN_FOLDER)
  files.forEach((file) => {
    const filePath = path.join(DERIVE_TYPE_GEN_FOLDER, file)
    dbg('Deleting file', filePath)
    fs.unlinkSync(filePath)
  })
}

function shapeToTSType(shape, root) {
  if (Array.isArray(shape)) {
    if (root) {
      let res = 'export type GEN = ('
      shape.forEach((s, idx) => {
        res = res + `arg${idx}:${shapeToTSType(s)},`
      })
      res = res.slice(0, -1) + ') => any'
      return res
    } else {
      let res = '('
      for (const item of shape) {
        res = res + shapeToTSType(item) + ','
      }
      res = res.slice(0, -1) + ')[]'
      return res
    }
  }
  if (typeof shape === 'object' && OPTION in shape) {
    return shapeToTSType(shape[OPTION])
  }
  if (typeof shape === 'object' && shape[UNION]) {
    let res = '('
    for (const u of shape[UNION]) {
      res = res + shapeToTSType(u) + '|'
    }
    res = res.slice(0, -1) + ')'
    return res
  }
  if (typeof shape === 'object') {
    let res = '{'
    for (const key in shape) {
      const quote = root ? '' : '"'
      res =
        res +
        `${quote}${key}${quote}${
          typeof shape[key] === 'object' && OPTION in shape[key] ? '?' : ''
        }: ${shapeToTSType(shape[key])},`
    }
    res = res.slice(0, -1) + '}'
    return res
  }
  return shape
}

function merge(root, obj) {
  for (const key in root) {
    if (!(key in obj)) {
      root[key] = { [OPTION]: root[key] }
    }
  }
  for (const key in obj) {
    if (!(key in root)) {
      root[key] = { [OPTION]: obj[key] }
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
              throw new Error('TODO: merge arrays')
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
            root[key][UNION].push(obj[key])
          }
        } else {
          //  two objects need to be merged
          throw new Error('merging object with union not yet supported')
        }
      }
  }
}

function _main(cb) {
  dbg('### Generating types')
  const files = fs.readdirSync(DERIVE_TYPE_GEN_FOLDER)
  files.forEach((file) => {
    const decoded = decodeFromFileName(file)
    const [fileName, line, column] = decoded
      .slice(1, decoded.length - 1)
      .split(':')
    const meta = { fileName, line: Number(line), column: Number(column) }
    dbg(meta)
    const filePath = path.join(DERIVE_TYPE_GEN_FOLDER, file)
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
    if (cb) {
      cb({ typeDef, res })
      return
    }

    const typeDefFilePath = filePath + '.d.ts'
    fs.writeFileSync(typeDefFilePath, res)
    const fileCont = fs.readFileSync(meta.fileName, 'utf8').split('\n')
    let rmLine = 0
    if (meta.line >= 3 && fileCont[meta.line - 3].startsWith('/**')) rmLine = 1
    fileCont.splice(meta.line - 2 - rmLine, rmLine, typeDef)
    fs.writeFileSync(meta.fileName, fileCont.join('\n'))
    dbg()
    dbg()
  })
}

function main() {
  const runtimeArgs = process.argv.slice(2)
  dbg('runtime arguments:', runtimeArgs)
  initializeFilesystem()

  exec(runtimeArgs.join(' '), (error, stdout, stderr) => {
    if (error) {
      console.error(error.message)
      return
    }

    if (stderr) {
      console.error(stderr)
      return
    }

    console.log(stdout)
    _main()
  })
}

if (require.main === module) {
  main()
}

function argumentToShape(arg) {
  if (arg === null) return 'null'
  if (arg === undefined) return 'undefined'
  if (typeof arg === 'number') return 'number'
  if (typeof arg === 'boolean') return 'boolean'
  if (typeof arg === 'string') return 'string'
  if (Array.isArray(arg)) {
    if (arg.some((a) => a && typeof a === 'object'))
      throw new Error('TODO: arrays of objects not yet supported')
    return [...new Set(arg.map((a) => argumentToShape(a)))]
  }
  if (typeof arg === 'object') {
    const shape = {}
    const sortedKeys = []
    for (key in arg) sortedKeys.push(key)
    sortedKeys.sort()
    for (const key of sortedKeys) {
      shape[key] = argumentToShape(arg[key])
    }
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
  const argShapes = args.map((a) => argumentToShape(a))
  const filePath = path.join(
    DERIVE_TYPE_GEN_FOLDER,
    encodeToFilename(locationInfo)
  )
  dbg('Appending file', filePath)

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
