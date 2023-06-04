/**
 * esbuild, that used by vite as default js/ts compiler, does not support `emitDecoratorMetadata`,
 * it results that we can't get 'design:type' metadata, and have to mark the type of each property manually.
 * To solve this problem, we use tsc to transpile the source code before esbuild.
 * @see https://www.typescriptlang.org/docs/handbook/decorators.html#metadata
 */

import path from 'path'
import typescript, { SourceFile } from 'typescript'
import { createFilter, FilterPattern } from '@rollup/pluginutils'
import { Plugin } from 'vite'

interface Options {
  include?: FilterPattern
  exclude?: FilterPattern
  tsconfig?: string
}

const hasClassDeclaration = (ast: SourceFile) =>
  ast.statements.some(statement => statement.kind === typescript.SyntaxKind.ClassDeclaration)

export default function emitReflectMetadata(options: Options = {}) {
  const tsConfigPath = options.tsconfig ? path.resolve(options.tsconfig) : path.resolve(process.cwd(), 'tsconfig.json')
  const tsconfig = typescript.readConfigFile(tsConfigPath, typescript.sys.readFile).config ?? {}
  const compilerOptions = { ...tsconfig.compilerOptions, module: typescript.ModuleKind.ESNext, sourceMap: false }
  const filter = createFilter(options.include, options.exclude)
  return {
    name: 'emit-reflect-metadata',
    enforce: 'pre',
    transform(source, id) {
      if (!filter(id)) {
        return source
      }
      const ast = typescript.createSourceFile(path.basename(id), source, typescript.ScriptTarget.ESNext, true)
      if (!hasClassDeclaration(ast)) {
        return source
      }
      const program = typescript.transpileModule(source, { compilerOptions })
      return {
        code: program.outputText,
        map: program.sourceMapText
      }
    }
  } as Plugin
}
