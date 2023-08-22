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
  disableCache?: boolean
}

export default function emitReflectMetadata(options: Options = {}) {
  const tsConfigPath = options.tsconfig ? path.resolve(options.tsconfig) : path.resolve(process.cwd(), 'tsconfig.json')
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
  const filter = createFilter(options.include, options.exclude)
  return {
    name: 'emit-reflect-metadata',
    enforce: 'pre',
    transform(source, id) {
      if (!filter(id)) {
        return source
      }
      return patch(id, source, { createProgram, disableCache: options.disableCache })
    }
  } as Plugin
}
