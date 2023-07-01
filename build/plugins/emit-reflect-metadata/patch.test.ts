import fs from 'fs'
import ts from 'typescript'
import path from 'path'
import patch from './patch'

const id = path.resolve('src/model/User.ts')
const source = fs.readFileSync(id, 'utf-8')
const tsConfigPath = path.resolve('tsconfig.json')
const config = ts.parseJsonConfigFileContent(
  ts.readConfigFile(tsConfigPath, ts.sys.readFile).config,
  ts.sys,
  path.dirname(tsConfigPath)
)

const createProgram = (fileName: string, old?: ts.Program) => {
  return ts.createProgram(
    [fileName],
    {
      ...config.options,
      module: ts.ModuleKind.ESNext,
      sourceMap: false
    },
    undefined,
    old
  )
}

console.log(patch(id, source, createProgram))
