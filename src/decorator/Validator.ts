import { ClassConstructor } from 'class-transformer'
import 'reflect-metadata'

export interface Validator {
  (value: any, model: any): Promise<void>
}

const VALIDATOR_KEY = Symbol('VALIDATOR')
const VALIDATOR_FIELDS_KEY = Symbol('VALIDATOR_FIELDS')

function getValidatorFields<T extends ClassConstructor<any>>(cls: T): (keyof InstanceType<T>)[] {
  return Reflect.getMetadata(VALIDATOR_FIELDS_KEY, cls) || []
}

function addValidatorFieldItem<T extends ClassConstructor<any>>(cls: T, field: keyof InstanceType<T>) {
  Reflect.defineMetadata(VALIDATOR_FIELDS_KEY, [...new Set([...getValidatorFields(cls), field])], cls)
}

export function getFieldValidators<T extends ClassConstructor<any>>(
  cls: T,
  propertyKey: keyof InstanceType<T>
): Validator[] {
  return Reflect.getMetadata(VALIDATOR_KEY, cls, propertyKey as string) || []
}

export function getAllFieldValidators<T extends ClassConstructor<any>>(
  cls: T
): Record<keyof InstanceType<T>, Validator[]> {
  return getValidatorFields(cls).reduce((map, field) => {
    map[field] = getFieldValidators(cls, field)
    return map
  }, {} as Record<keyof InstanceType<T>, Validator[]>)
}

export default function (...params: Validator[]) {
  return function (prototype: Object, propertyKey: string | symbol) {
    addValidatorFieldItem(prototype.constructor as ClassConstructor<any>, propertyKey as keyof InstanceType<any>)
    Reflect.defineMetadata(VALIDATOR_KEY, params, prototype.constructor, propertyKey)
  }
}
