/**
 * This module provides the base class for all models,
 * it provides some useful methods to manipulate models.
 *
 * Every model should inherit BaseModel.
 */

import { instanceToPlain, plainToInstance } from 'class-transformer'
import { getModel, Model } from '@/decorator/Model'
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

/**
 * Every model should inherit this class.
 */
export default class BaseModel {
  /**
   * instanceToInstance will not convert naming case, call our implementation instead.
   */
  clone() {
    const model = Reflect.getPrototypeOf(this)!.constructor as typeof BaseModel
    return model.fromModelPlain(this.toModelPlain()) as typeof this
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
    const cls = Reflect.getPrototypeOf(this)!.constructor
    return traverseOnSerialize(instanceToPlain(this), cls, cls, options)
  }
  /**
   * there are some differences to `toPlain`:
   *
   * 1. ignore will be disabled.
   *
   * For this lib, it is only used in `clone` method.
   */
  toModelPlain() {
    return this.toPlain({ disableIgnore: true })
  }
  /**
   * Validate current model **by shallow**, return a list of errors when validate all fields, or a single error message when validate a specific field, empty list or undefined means no error.
   *
   * Child models **will not** be validated automatically, you should do it yourself.
   */
  validate<T extends BaseModel>(this: T, field: keyof T): Promise<string>
  validate<T extends BaseModel>(this: T): Promise<{ field: keyof T; message: string }[]>
  async validate<T extends BaseModel>(this: T, field?: keyof T) {
    const model = Reflect.getPrototypeOf(this)!.constructor as typeof BaseModel
    const validators = {} as Record<keyof typeof this, Validator[]>
    if (field) {
      validators[field] ??= []
      // @ts-ignore
      validators[field].push(...BaseModel.getFieldValidators.call(model, field))
      // Promise.allSettled(validators.map((validator) => validator(this[field], this)))
    } else {
      for (const [k, v] of Object.entries(BaseModel.getAllFieldValidators.call(model))) {
        // @ts-ignore
        validators[k] = v
      }
    }
    const errors = [] as { field: keyof T; message: string }[]
    await Promise.all(
      Object.entries(validators).map(([field, validators]) => {
        return Promise.all(validators.map((validator) => validator(this[field as keyof T], this))).catch(
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
  static getFieldValidators<T extends typeof BaseModel>(this: T, field: keyof InstanceType<T>) {
    return getFieldValidators(this, field)
  }
  static getAllFieldValidators<T extends typeof BaseModel>(this: T) {
    return getAllFieldValidators(this)
  }
  static default<T extends typeof BaseModel>(this: T) {
    const initializers = getInitializers(this)
    const raw = Object.entries(initializers).reduce((raw, [field, initializer]) => {
      if (initializer === void 0) return raw
      // @ts-ignore
      raw[field] = typeof initializer === 'function' ? initializer() : initializer
      return raw
    }, {} as object)
    return this.from({}).merge(raw)
  }
  static getField<T extends typeof BaseModel>(this: T, field: keyof InstanceType<T>) {
    return getField(this, field)
  }
  static getFields<T extends typeof BaseModel>(this: T) {
    return getFields(this)
  }
  static getModel() {
    return getModel(this)
  }
  static from<T extends typeof BaseModel, V>(this: T, raw: V, options?: FromOptions): InstanceType<T>
  static from<T extends typeof BaseModel, V>(this: T, raw: V[], options?: FromOptions): InstanceType<T>[]
  static from<T extends typeof BaseModel, V>(
    this: T,
    raw: V | V[],
    options?: FromOptions
  ): InstanceType<T> | InstanceType<T>[] {
    if (raw instanceof BaseModel) {
      raw = raw.toPlain() as V
    } else if (typeof raw === 'string') {
      raw = JSON.parse(raw)
    }
    // @ts-ignore
    return plainToInstance(this, traverseOnDeserialize(raw, this, this, options))
  }

  static fromModelPlain<T extends typeof BaseModel, V>(this: T, raw: V): InstanceType<T>
  static fromModelPlain<T extends typeof BaseModel, V>(this: T, raw: V[]): InstanceType<T>[]
  static fromModelPlain<T extends typeof BaseModel, V>(this: T, raw: V | V[]): InstanceType<T> | InstanceType<T>[] {
    return this.from(raw, { disableIgnore: true })
  }

  static new<T extends typeof BaseModel, I extends InstanceType<T>>(this: T, raw: NonFunctionRecord<I>) {
    return this.from(raw)
  }
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
  const model: Model = (cls?.getModel?.() ?? superCls?.getModel?.() ?? {}) as Model
  const fields = cls?.getFields?.() ?? {}
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
      const _superCls = cls?.prototype instanceof BaseModel ? cls : superCls
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
  const model = (cls?.getModel?.() ?? superCls?.getModel?.() ?? {}) as Model
  const fields = cls?.getFields?.() ?? {}
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
    if (field?.transform || rawValue instanceof BaseModel) {
      transformed[k] = rawValue
      continue
    }
    const _superCls = cls?.prototype instanceof BaseModel ? cls : superCls
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

export type BaseModelConstructor = typeof BaseModel
