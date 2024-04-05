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
  return false
}
const isArrayType = (type: ts.Type): boolean => {
  return type.flags === ts.TypeFlags.Object && type.symbol?.name === 'Array'
}
const isFunctionType = (type: ts.Type): boolean => {
  const signature = type?.getCallSignatures()?.[0]
  if (!signature?.declaration) return false
  return ts.isFunctionTypeNode(signature.declaration)
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

const getPrimitiveType = (type: ts.Type): string | undefined => {
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

const getClassFields = (node: ts.ClassDeclaration, checker: ts.TypeChecker): string[] => {
  if (!node.name) return []
  return checker
    .getTypeAtLocation(node.name)
    .getProperties()
    .filter((prop) => {
      const vd = prop.valueDeclaration
      if (!vd) return false
      if (ts.isMethodDeclaration(vd)) return false
      if (ts.isPropertyDeclaration(vd)) {
        const type = checker.getTypeAtLocation(vd)
        return !isFunctionType(type)
      }
      return true
    })
    .map((t) => t.getName())
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

// inject type and fields metadata to class members, and set default type to be `undefined` if not specified
const injectMetaData = (node: ts.PropertyDeclaration, type: string = 'void 0', fields: string[] = []) => {
  let isDesignTypeExists = false
  let isDesignFieldsExists = false
  let isDesignInitializerExists = false
  for (const modifier of node.modifiers ?? []) {
    if (ts.isDecorator(modifier)) {
      const text = modifier.getText()
      isDesignTypeExists = isDesignTypeExists || text.startsWith("@Reflect.metadata('design:type'")
      isDesignFieldsExists = isDesignFieldsExists || text.startsWith("@Reflect.metadata('design:fields'")
      isDesignInitializerExists = isDesignInitializerExists || text.startsWith("@Reflect.metadata('design:initializer'")
    }
  }
  const typeDecorator = isDesignTypeExists
    ? void 0
    : createMetaDataDecorator('design:type', ts.factory.createIdentifier(type))
  const membersDecorator = isDesignFieldsExists
    ? void 0
    : createMetaDataDecorator(
        'design:fields',
        ts.factory.createArrayLiteralExpression(fields.map((member) => ts.factory.createStringLiteral(member)))
      )
  const initializerDecorator = isDesignInitializerExists
    ? void 0
    : createMetaDataDecorator(
        'design:initializer',
        ts.factory.createArrowFunction(
          void 0,
          void 0,
          void 0,
          void 0,
          ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
          ts.factory.createParenthesizedExpression(node.initializer ?? ts.factory.createIdentifier('void 0'))
        )
      )
  const afterLastDecoratorIndex = findLastIndexDecoratorOfModifiers(node.modifiers) + 1
  const headingModifiers = [...(node.modifiers ?? []).slice(0, afterLastDecoratorIndex)]
  const trailingModifiers = [...(node.modifiers ?? []).slice(afterLastDecoratorIndex)]
  return ts.factory.updatePropertyDeclaration(
    node,
    [...headingModifiers, membersDecorator, typeDecorator, initializerDecorator, ...trailingModifiers].filter(Boolean),
    node.name,
    node.questionToken,
    node.type,
    node.initializer
  )
}

const annotate = (node: ts.Node, checker: ts.TypeChecker) => {
  if (!ts.isClassDeclaration(node)) return node
  const isDecoratedWithModel = node.modifiers?.some((modifier) => {
    return ts.isDecorator(modifier) && modifier.expression.getFullText().startsWith('Model(')
  })
  if (!isDecoratedWithModel) return node
  const patchedMembers = []
  for (const member of node.members) {
    if (!ts.isPropertyDeclaration(member)) {
      patchedMembers.push(member)
      continue
    }
    if (ts.isMemberName(member.name)) {
      let type = checker.getTypeAtLocation(member.name)
      if (member.questionToken && type.flags === ts.TypeFlags.Union) {
        // when type is optional, we should find the non-undefined type
        // @ts-ignore
        type = (type.types as ts.Type[]).find((t) => t.flags !== ts.TypeFlags.Undefined)
      }
      // get all member names of the type except methods
      const fields = type
        .getProperties()
        .filter((member) => member.valueDeclaration && !ts.isMethodDeclaration(member.valueDeclaration))
        .map((member) => member.getName())
      let patched = member
      if (isClassType(type)) {
        patched = injectMetaData(
          member,
          member.type && ts.isTypeReferenceNode(member.type) ? member.type?.typeName?.getText() : 'Object',
          fields
        )
      } else if (isArrayType(type) || checker.isArrayLikeType(type)) {
        const elementType = getArrayElement(type)
        if (!elementType) {
          // if we can't get the element type, we just annotate it as Array
          patched = injectMetaData(member, 'Array')
        } else if (isClassType(elementType)) {
          patched = injectMetaData(member, elementType.symbol?.name, [])
        } else if (isObjectType(elementType)) {
          patched = injectMetaData(member, 'Object', fields)
        } else {
          // primitive type
          patched = injectMetaData(member, getPrimitiveType(elementType))
        }
      } else if (isObjectType(type)) {
        patched = injectMetaData(member, 'Object', fields)
      } else {
        // primitive type
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
          getClassFields(node, checker).map((field) => ts.factory.createStringLiteral(field))
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

const createTransformer = (checker: ts.TypeChecker) => {
  return (context: ts.TransformationContext) => {
    // only transform the top level class declaration
    return (node: ts.SourceFile) => ts.visitEachChild(node, (node) => annotate(node, checker), context)
  }
}
const hasClassDeclaration = (ast: ts.SourceFile) => {
  return ast.statements?.some((statement) => {
    if (!ts.isClassDeclaration(statement)) {
      return false
    }
    return statement.modifiers?.some((modifier) => {
      return ts.isDecorator(modifier) && modifier.expression?.getFullText()?.startsWith('Model(')
    })
  })
}

interface Context {
  id: string
  program: ts.Program
  checker: ts.TypeChecker
}

export default function ({ id, program, checker }: Context) {
  const sourceFile = program.getSourceFile(id)
  if (!sourceFile || !hasClassDeclaration(sourceFile)) {
    return
  }
  return printer.printFile(ts.transform(sourceFile, [createTransformer(checker)]).transformed[0])
}
