/**
 * there are some helper functions for `Field` decorator (ref to @/decorator/Field.ts),
 * it can be used to transform the data type of the property when serialization/deserialization.
 * @example:
 * import Field from '@/decorator/Field'
 * import { dateTransformer } from '@/utils/transformer'
 *
 * @Field({ transform: dateTransformer('yyyy-MM-dd') })
 */

import {
  ClassConstructor,
  TransformFnParams,
  TransformationType,
  instanceToPlain,
  plainToInstance
} from 'class-transformer'
import * as dayjs from 'dayjs'
import { TransformConfig } from '@/decorator/Field'
import BaseModel from '@/model/BaseModel'

/**
 * transform pure string to Dayjs, or Dayjs to string with forwarded format
 * @param format forwarded format string after serialization
 * @see https://dayjs.gitee.io/docs/en/display/format
 */
export function dateTransformer(format: string) {
  return (params: TransformFnParams) => {
    const { value, type } = params
    if (!value) {
      return value
    }
    let toArray = Array.isArray(value) ? value : [value]
    if (type === TransformationType.CLASS_TO_PLAIN) {
      toArray = toArray.map((v) => (v as dayjs.Dayjs).format(format))
    } else if (type === TransformationType.PLAIN_TO_CLASS) {
      toArray = toArray.map((v) => dayjs(v.replace(/-/g, '/')))
    }
    return Array.isArray(value) ? toArray : toArray[0]
  }
}

/**
 * this transformer is only used for class-transformer, never use it in other places
 * @see @/decorator/Field.ts
 */
export function typeTransformer(cls: ClassConstructor<unknown>) {
  return (params: TransformFnParams) => {
    const { value, type } = params
    if (
      Object.is(value, null) ||
      Object.is(value, NaN) ||
      Object.is(value, void 0) ||
      Object.is(Math.abs(value), Infinity)
    ) {
      return value
    }
    if (type === TransformationType.CLASS_TO_PLAIN) {
      if (value instanceof BaseModel) {
        return value.toPlain()
      }
      return instanceToPlain(value)
    }
    if (type === TransformationType.PLAIN_TO_CLASS) {
      if (cls.prototype instanceof BaseModel) {
        // @ts-ignore
        return cls.from(value)
      }
      return plainToInstance(cls, value)
    }
    if (value instanceof BaseModel) {
      return value.clone()
    }
    return value
  }
}

const returnSelf = (v: any) => v

export function wrapTransformConfig({
  onDeserialize = returnSelf,
  onSerialize = returnSelf,
  onClone = returnSelf
}: TransformConfig) {
  return (params: TransformFnParams) => {
    const { value, type, obj } = params
    if (type === TransformationType.CLASS_TO_PLAIN) {
      return onSerialize(value, obj)
    }
    if (type === TransformationType.PLAIN_TO_CLASS) {
      return onDeserialize(value, obj)
    }
    return onClone(value, obj)
  }
}
