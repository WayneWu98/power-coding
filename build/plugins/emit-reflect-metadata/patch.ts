import ts from 'typescript'

const printer = ts.createPrinter()

const isClassType = (type: ts.Type) => type.isClass()
const isObjectType = (type: ts.Type): boolean => {
  if (type.flags === ts.TypeFlags.Object) {
    return true
  }
  if (type.isIntersection()) {
    return type.types.some((t) => isObjectType(t))
  }
}
const isArrayType = (type: ts.Type): boolean => {
  return type.flags === ts.TypeFlags.Object && type.symbol?.name === 'Array'
}

const createMetaDataDecorator = (name: string, ...expressions: ts.Expression[]) => {
  return ts.factory.createDecorator(
    ts.factory.createCallExpression(ts.factory.createIdentifier('Reflect.metadata'), undefined, [
      ts.factory.createStringLiteral(name),
      ...expressions
    ])
  )
}

const getArrayElement = (type: ts.Type): ts.Type | undefined => {
  // @ts-ignore
  return type.typeArguments?.[0]
}
const getPrimitiveType = (type: ts.Type): string => {
  switch (type.flags) {
    case ts.TypeFlags.String:
    case ts.TypeFlags.StringLike:
    case ts.TypeFlags.StringLiteral:
      return 'String'
    case ts.TypeFlags.Number:
    case ts.TypeFlags.NumberLike:
    case ts.TypeFlags.NumberLiteral:
      return 'Number'
    case ts.TypeFlags.Boolean:
    case ts.TypeFlags.BooleanLike:
    case ts.TypeFlags.BooleanLiteral:
      return 'Boolean'
    default:
      return void 0
  }
}

const findLastIndexDecoratorOfModifiers = (modifiers?: ArrayLike<ts.ModifierLike>) => {
  if (!modifiers || modifiers.length <= 0) {
    return -1
  }
  for (let i = 0; i < modifiers.length; i++) {
    if (!ts.isDecorator(modifiers[i])) {
      return i - 1
    }
  }
  return modifiers.length - 1
}

const injectMetaData = (node: ts.PropertyDeclaration, type: string = 'void 0', fields: string[] = []) => {
  const typeDecorator = createMetaDataDecorator('design:type', ts.factory.createIdentifier(type))
  const membersDecorator = createMetaDataDecorator(
    'design:fields',
    ts.factory.createArrayLiteralExpression(fields.map((member) => ts.factory.createStringLiteral(member)))
  )
  const afterLastDecoratorIndex = findLastIndexDecoratorOfModifiers(node.modifiers) + 1
  const headingModifiers = [...(node.modifiers ?? []).slice(0, afterLastDecoratorIndex)]
  const trailingModifiers = [...(node.modifiers ?? []).slice(afterLastDecoratorIndex)]
  return ts.factory.updatePropertyDeclaration(
    node,
    [...headingModifiers, membersDecorator, typeDecorator, ...trailingModifiers],
    node.name,
    node.questionToken,
    node.type,
    node.initializer
  )
}

const annotate = (node: ts.Node, checker: ts.TypeChecker) => {
  if (ts.isClassDeclaration(node)) {
    const fields = [] as ts.PropertyDeclaration[]
    const patchedMembers = []
    for (const member of node.members) {
      if (!ts.isPropertyDeclaration(member)) {
        patchedMembers.push(member)
        continue
      }
      fields.push(member)
      if (ts.isMemberName(member.name)) {
        let type = checker.getTypeAtLocation(member.name)
        if (member.questionToken && type.flags === ts.TypeFlags.Union) {
          // when type is optional, we should find the non-undefined type
          // @ts-ignore
          type = (type.types as ts.Type[]).find((t) => t.flags !== ts.TypeFlags.Undefined)
        }
        const fields = type
          .getProperties()
          .filter((member) => member.valueDeclaration && !ts.isMethodDeclaration(member.valueDeclaration))
          .map((member) => member.getName())
        let patched = member
        if (isClassType(type)) {
          patched = injectMetaData(
            member,
            ts.isTypeReferenceNode(member.type) ? member.type?.typeName?.getText() : 'Object',
            fields
          )
        } else if (isArrayType(type) || checker.isArrayLikeType(type)) {
          const elementType = getArrayElement(type)
          if (!elementType) {
            patched = injectMetaData(member, 'Array')
          } else if (isClassType(elementType)) {
            patched = injectMetaData(member, elementType.symbol?.name, [])
          } else if (isObjectType(elementType)) {
            patched = injectMetaData(member, 'Object', fields)
          } else {
            patched = injectMetaData(member, getPrimitiveType(elementType))
          }
        } else if (isObjectType(type)) {
          patched = injectMetaData(member, 'Object', fields)
        } else {
          patched = injectMetaData(member, getPrimitiveType(type))
        }
        patchedMembers.push(patched)
      }
    }
    const afterLastDecoratorIndex = findLastIndexDecoratorOfModifiers(node.modifiers) + 1
    const headingModifiers = [...(node.modifiers ?? []).slice(0, afterLastDecoratorIndex)]
    const trailingModifiers = [...(node.modifiers ?? []).slice(afterLastDecoratorIndex)]
    return ts.factory.updateClassDeclaration(
      node,
      [
        ...headingModifiers,
        createMetaDataDecorator(
          'design:fields',
          ts.factory.createArrayLiteralExpression(
            fields.map((field) => ts.factory.createStringLiteral(field.name.getText()))
          )
        ),
        ...trailingModifiers
      ],
      node.name,
      node.typeParameters,
      node.heritageClauses,
      patchedMembers
    )
  }
  return node
}

const createTransformer = (program: ts.Program) => {
  const checker = program.getTypeChecker()
  return (context) => {
    // only transform the top level class declaration
    return (node) => ts.visitEachChild(node, (node) => annotate(node, checker), context)
  }
}

const hasClassDeclaration = (ast: ts.SourceFile) => ast.statements.some((statement) => ts.isClassDeclaration(statement))

const PROGRAM_CACHE = new Map<string, ts.Program>()

export default function (id: string, code: string, createProgram: (fileName: string, old?: ts.Program) => ts.Program) {
  const sourceFile = ts.createSourceFile(id, code, ts.ScriptTarget.Latest, true)
  if (!sourceFile || !hasClassDeclaration(sourceFile)) {
    return code
  }
  PROGRAM_CACHE.set(id, createProgram(id, PROGRAM_CACHE.get(id)))
  const program = PROGRAM_CACHE.get(id)
  return printer.printFile(ts.transform(program.getSourceFile(id), [createTransformer(program)]).transformed[0])
}
