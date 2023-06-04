export const enum NamingCase {
  snake_case = 'snake',
  camelCase = 'camel',
  PascalCase = 'pascal',
  NonCase = 'non'
}

export function camelize(str: string) {
  const prefix = str.match(/^_*/g)?.[0] ?? ''
  return (
    prefix +
    str
      .replace(/([A-Z])/g, (letter, index) => {
        return index === 0 ? letter : `_${letter}`
      })
      .replace(/^_*/g, '')
      .toLowerCase()
      .replace(/_+[^_]/g, (matched) => {
        return matched.replace(/_/g, '').toUpperCase()
      })
      .replace(/\s+/g, '')
  )
}

export function snakeize(str: string) {
  const prefix = str.match(/^_*/g)?.[0] ?? ''
  return (
    prefix +
    str
      .replace(/^_*/g, '')
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/\s+/g, '')
  )
}

export function pascalize(str: string) {
  const prefix = str.match(/^_*/g)?.[0] ?? ''
  return (
    prefix +
    str
      .replace(/^_*/g, '')
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/(^|_)(\w)/g, (_, __, c) => c.toUpperCase())
      .replace(/\s+/g, '')
  )
}

export function kebabize(str: string) {
  const prefix = str.match(/^_*/g)?.[0] ?? ''
  return (
    prefix +
    str
      .replace(/^_*/g, '')
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/\s+/g, '')
  )
}

export const NAMING_CASE_MAP: Record<NamingCase, (str: string) => string> = {
  [NamingCase.camelCase]: camelize,
  [NamingCase.snake_case]: snakeize,
  [NamingCase.PascalCase]: pascalize,
  // do nothing
  [NamingCase.NonCase]: (str: string) => str
}
