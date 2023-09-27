import { ClassConstructor } from 'class-transformer'
import 'reflect-metadata'

export function getClassFieldList<T extends ClassConstructor<any>>(cls: T): (keyof InstanceType<T>)[] {
  return Reflect.getMetadata('design:fields', cls) ?? []
}

export function getMemberFieldList<T extends ClassConstructor<any>>(
  cls: T,
  field: Exclude<keyof InstanceType<T>, number>
): string[] {
  return Reflect.getMetadata('design:fields', cls.prototype, field) ?? []
}

export function getInitializers<T extends ClassConstructor<any>>(cls: T): object {
  const fields = getClassFieldList(cls) ?? []
  return fields.reduce((initializers, field) => {
    // @ts-ignore
    initializers[field] = Reflect.getMetadata('design:initializer', cls.prototype, field)
    return initializers
  }, {} as object)
}
