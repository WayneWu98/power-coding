import { ClassConstructor } from 'class-transformer'
import 'reflect-metadata'

export interface Validator {
  (value: any, model: any): Promise<void>
}

const VALIDATOR_KEY = Symbol('VALIDATOR')

export function getFieldValidators<T extends ClassConstructor<any>>(
  cls: T,
  propertyKey: keyof InstanceType<T>
): Validator[] {
  return Reflect.getMetadata(VALIDATOR_KEY, cls, propertyKey as string) || []
}

export default function (...params: Validator[]) {
  return function (prototype: Object, propertyKey: string | symbol) {
    Reflect.defineMetadata(VALIDATOR_KEY, params, prototype.constructor, propertyKey)
  }
}
