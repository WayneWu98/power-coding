/**
 * esbuild, that used by vite as default js/ts compiler, does not support `emitDecoratorMetadata`,
 * it results that we can't get 'design:type' metadata, and have to mark the type for each property manually.
 * To solve this problem, we use typescript compiler api to patch the source code.
 * @see https://www.typescriptlang.org/docs/handbook/decorators.html#metadata
 */

import path from 'path'
import ts from 'typescript'
import { createFilter, FilterPattern } from '@rollup/pluginutils'
import { Plugin } from 'vite'
import patch from './patch'

interface Options {
  include?: FilterPattern
  exclude?: FilterPattern
  tsconfig?: string
}

let program: ts.Program
let checker: ts.TypeChecker

export default function emitReflectMetadata(options: Options = {}) {
  const tsConfigPath = options.tsconfig ? path.resolve(options.tsconfig) : path.resolve(process.cwd(), 'tsconfig.json')
  const createOrUpdateProgram = () => {
    const { fileNames, options } = ts.parseJsonConfigFileContent(
      ts.readConfigFile(tsConfigPath, ts.sys.readFile).config,
      ts.sys,
      path.dirname(tsConfigPath)
    )
    program = ts.createProgram(fileNames, options, ts.createCompilerHost(options), program)
    checker = program.getTypeChecker()
  }
  const filter = createFilter(options.include, options.exclude)
  return {
    name: 'emit-reflect-metadata',
    enforce: 'pre',
    buildStart() {
      createOrUpdateProgram()
    },
    handleHotUpdate() {
      createOrUpdateProgram()
    },
    transform(code, id) {
      if (!filter(id)) {
        return { code }
      }
      const patched = patch({ program, id, checker })
      return { code: patched ?? code }
    }
  } as Plugin
}
