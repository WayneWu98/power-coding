/**
 * This module provides the base class for all models,
 * it provides some useful methods to manipulate models.
 *
 * Every model should decorate with @Serde.
 */

import { ClassConstructor, instanceToPlain, plainToInstance } from 'class-transformer'
import { getSerdeableConfig, SerdeableConfig } from '@/decorator/Serdeable'
import { getField, getFields, Field, getShouldNestFields } from '@/decorator/Field'
import { NamingCase, NAMING_CASE_MAP } from '@/utils/naming-case'
import { Validator, getFieldValidators, getAllFieldValidators } from '@/decorator/Validator'
import { DEFAULT_CLASS_NAMING_CASE } from '@/config'
import { getInitializers, getMemberFieldList } from '@/utils/metadata'

interface ToPlainOptions {
  disableIgnore?: boolean
}
interface FromOptions {
  disableIgnore?: boolean
}

export const serdeable = Symbol()

/**
 * Every model should inherit this class.
 */
export default class Serde {
  /**
   * instanceToInstance will not convert naming case, call our implementation instead.
   */
  clone() {
    const serdeable = Reflect.getPrototypeOf(this)!.constructor as SerdeableClass
    return Serde.clone(serdeable, this)
  }
  static clone<T extends SerdeableClass>(serdeable: T, instance: InstanceType<T>) {
    return Serde.fromModelPlain(serdeable, instance.toModelPlain()) as InstanceType<T>
  }
  /**
   * merge the specified fields of target to this in-place, existing properties will be overwritten
   */
  merge<T extends object>(target: T, fields = Object.keys(target) as (keyof T)[]) {
    for (const field of fields) {
      if (Reflect.has(this, field)) {
        // @ts-ignore
        this[field] = target[field]
      }
    }
    return this
  }
  /**
   * mix target and this to be a new instance.
   */
  mix<T extends object>(target: T, fields = Object.keys(target) as (keyof T)[]) {
    const cloned = this.clone()
    for (const field of fields) {
      // @ts-ignore
      cloned[field] = target[field]
    }
    return cloned
  }
  /**
   * Convert current model to plain object.
   */
  toPlain(options?: ToPlainOptions): object {
    return Serde.toPlain(this, options)
  }
  static toPlain<T extends SerdeableClass>(instance: InstanceType<T>, options?: ToPlainOptions) {
    const cls = Reflect.getPrototypeOf(instance)!.constructor
    return traverseOnSerialize(instanceToPlain(instance), cls, cls, options)
  }
  /**
   * there are some differences to `toPlain`:
   *
   * 1. ignore will be disabled.
   *
   * For this lib, it is only used in `clone` method.
   */
  toModelPlain() {
    return Serde.toModelPlain(this)
  }

  static toModelPlain<T extends SerdeableClass>(instance: InstanceType<T>) {
    return Serde.toPlain(instance, { disableIgnore: true })
  }
  /**
   * Validate current model **by shallow**, return a list of errors when validate all fields, or a single error message when validate a specific field, empty list or undefined means no error.
   *
   * Child models **will not** be validated automatically, you should do it yourself.
   */
  validate<T extends Serde>(this: T, field: keyof T): Promise<string>
  validate<T extends Serde>(this: T): Promise<{ field: keyof T; message: string }[]>
  async validate<T extends Serde>(this: T, field?: keyof T) {
    return Serde.validate(this, field as keyof Serde) as any
  }

  static validate<T extends SerdeableClass>(instance: InstanceType<T>, field: keyof InstanceType<T>): Promise<string>
  static validate<T extends SerdeableClass>(
    instance: InstanceType<T>
  ): Promise<{ field: keyof InstanceType<T>; message: string }[]>
  static async validate<T extends SerdeableClass>(instance: InstanceType<T>, field?: keyof InstanceType<T>) {
    const serdeable = Reflect.getPrototypeOf(instance)!.constructor as SerdeableClass
    const validators = {} as Record<keyof typeof instance, Validator[]>
    if (field) {
      validators[field] ??= []
      // @ts-ignore
      validators[field].push(...Serde.getFieldValidators(serdeable, field))
      // Promise.allSettled(validators.map((validator) => validator(this[field], this)))
    } else {
      for (const [k, v] of Object.entries(Serde.getAllFieldValidators(serdeable))) {
        // @ts-ignore
        validators[k] = v
      }
    }
    const errors = [] as { field: keyof T; message: string }[]
    await Promise.all(
      Object.entries(validators).map(([field, validators]) => {
        return Promise.all(
          validators.map((validator) => validator(instance[field as keyof InstanceType<T>], this))
        ).catch(
          // @ts-ignore
          (message: string) => errors.push({ field, message })
        )
      })
    )
    if (field) {
      return errors[0]?.message
    }
    return errors
  }
  static getFieldValidators<T extends SerdeableClass>(serdeable: T, field: keyof InstanceType<T>) {
    return getFieldValidators(serdeable, field)
  }
  static getAllFieldValidators<T extends SerdeableClass>(serdeable: T) {
    return getAllFieldValidators(serdeable)
  }
  static default<T extends SerdeableClass>(serdeable: T) {
    const initializers = getInitializers(serdeable)
    const raw = Object.entries(initializers).reduce((raw, [field, initializer]) => {
      if (initializer === void 0) return raw
      // @ts-ignore
      raw[field] = typeof initializer === 'function' ? initializer() : initializer
      return raw
    }, {} as object)
    return Serde.from(serdeable, {}).merge(raw)
  }
  static getField<T extends SerdeableClass>(serdeable: T, field: keyof InstanceType<T>) {
    return getField(serdeable, field)
  }
  static getFields<T extends SerdeableClass>(serdeable: T) {
    return getFields(serdeable)
  }
  static getSerdeableConfig<T extends SerdeableClass>(serdeable: T) {
    return getSerdeableConfig(serdeable)
  }
  static from<T extends SerdeableClass, V>(serdeable: T, raw: V, options?: FromOptions): InstanceType<T>
  static from<T extends SerdeableClass, V>(serdeable: T, raw: V[], options?: FromOptions): InstanceType<T>[]
  static from<T extends SerdeableClass, V>(
    serdeable: T,
    raw: V | V[],
    options?: FromOptions
  ): InstanceType<T> | InstanceType<T>[] {
    if (raw instanceof Serde) {
      raw = raw.toPlain() as V
    } else if (typeof raw === 'string') {
      raw = JSON.parse(raw)
    }
    // @ts-ignore
    return plainToInstance(serdeable, traverseOnDeserialize(raw, serdeable, serdeable, options))
  }

  static fromModelPlain<T extends SerdeableClass, V>(serdeable: T, raw: V): InstanceType<T>
  static fromModelPlain<T extends SerdeableClass, V>(serdeable: T, raw: V[]): InstanceType<T>[]
  static fromModelPlain<T extends SerdeableClass, V>(serdeable: T, raw: V | V[]): InstanceType<T> | InstanceType<T>[] {
    return Serde.from(serdeable, raw, { disableIgnore: true })
  }
}

export function isSerdeable(cls: Function): cls is SerdeConstructor {
  return cls.prototype[serdeable]
}

function shouldIgnoreSerialize(field?: Field) {
  if (typeof field?.ignore === 'boolean' && field.ignore) {
    return true
  }
  if (typeof field?.ignore === 'object' && field.ignore.onSerialize) {
    return true
  }
  return false
}

interface TraverseOnSerializeOptions {
  disableIgnore?: boolean
}

// convert naming case to forwarded while serializing
function traverseOnSerialize(obj: any, cls: any, superCls: any, options?: TraverseOnSerializeOptions): any {
  if (typeof obj !== 'object' || Object.is(obj, null)) {
    // primitive type
    return obj
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => traverseOnSerialize(item, cls, superCls, options))
  }
  const transformed: Record<keyof any, any> = {}
  const model: SerdeableConfig = (Serde.getSerdeableConfig(cls) ??
    Serde.getSerdeableConfig(superCls) ??
    {}) as SerdeableConfig
  const fields = Serde.getFields(cls) ?? {}
  const arrayedFields = Object.values(fields) as Field[]
  for (const [rawKey, rawValue] of Object.entries(obj)) {
    let key = rawKey
    const field = fields[key] as Field
    if (!arrayedFields.some((conf) => conf.fieldName === key)) {
      key = NAMING_CASE_MAP[model?.rename ?? NamingCase.NonCase](key)
    }
    if (!options?.disableIgnore && shouldIgnoreSerialize(field)) {
      continue
    }
    if (field?.transform) {
      transformed[key] = rawValue
    } else {
      const _superCls = cls?.prototype instanceof Serde ? cls : superCls
      transformed[key] = traverseOnSerialize(rawValue, fields[rawKey]?.type, _superCls, options)
    }
    if (field?.flatOnSerialize) {
      Object.assign(transformed, transformed[key])
      delete transformed[key]
    }
  }
  return transformed
}

function shouldIgnoreDeserialize(field?: Field) {
  if (typeof field?.ignore === 'boolean' && field.ignore) {
    return true
  }
  if (typeof field?.ignore === 'object' && field.ignore.onDeserialize) {
    return true
  }
  return false
}

interface TraverseOnDeserializeOptions {
  disableIgnore?: boolean
}

// convert naming case to camel case while deserializing
function traverseOnDeserialize(obj: any, cls: any, superCls: any, options?: TraverseOnDeserializeOptions): any {
  if (typeof obj !== 'object' || Object.is(obj, null)) {
    // primitive type
    return obj
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => traverseOnDeserialize(item, cls, superCls, options))
  }
  const transformed: Record<keyof any, any> = {}
  const model = (Serde.getSerdeableConfig(cls) ?? Serde.getSerdeableConfig(superCls) ?? {}) as SerdeableConfig
  const fields = Serde.getFields(cls) ?? {}
  const arrayedFields = Object.values(fields) as Field[]
  for (const [rawKey, rawValue] of Object.entries(obj)) {
    let k = rawKey
    const shouldSkipConvert =
      arrayedFields.some((conf) => conf.fieldName === rawKey) || model?.rename === NamingCase.NonCase
    if (!shouldSkipConvert) {
      k = NAMING_CASE_MAP[DEFAULT_CLASS_NAMING_CASE](rawKey)
    }
    const field = fields[k] as Field
    if (!options?.disableIgnore && shouldIgnoreDeserialize(field)) {
      continue
    }
    // @ts-ignore
    if (field?.transform || isSerdeable(rawValue?.constructor)) {
      transformed[k] = rawValue
      continue
    }
    const _superCls = isSerdeable(cls) ? cls : superCls
    if ((Object.is(rawValue, null) || Object.is(rawValue, void 0)) && typeof field?.fallback === 'function') {
      transformed[k] = field.fallback()
      continue
    }
    transformed[k] = traverseOnDeserialize(rawValue, fields[rawKey]?.type, _superCls, options)
  }
  const nested = new Set<string>()
  if (cls) {
    const shouldNestFields = getShouldNestFields(cls)
    for (const k of shouldNestFields) {
      // @ts-ignore
      let shouldCollect = getMemberFieldList(cls, k)
      if (shouldCollect.length <= 0) {
        shouldCollect = Object.keys(transformed).filter((key) => !shouldNestFields.includes(key))
      }
      shouldCollect.forEach((key) => nested.add(key))
      transformed[k] = Object.values(shouldCollect).reduce((map, k) => {
        map[k] = transformed[k]
        return map
      }, {} as Record<keyof any, any>)
    }
  }
  ;[...nested].forEach((key) => delete transformed[key])
  return transformed
}

export type SerdeConstructor = typeof Serde
export type SerdeableClass = ClassConstructor<Serde>
