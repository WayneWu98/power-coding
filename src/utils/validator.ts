/**
 * there are some validator functions for `Validator` decorator (ref to @/decorator/Validator.ts),
 * it can be used to validate value while calling Model.validate().
 *
 * @example:
 * import Validator from '@/decorator/Validator'
 * import { Required, Range } from '@/utils/validator'
 *
 * @Validator(Required(), Range(1, 10))
 */

import { ValidatorRule } from 'ant-design-vue/es/form/interface'
import { Dayjs } from 'dayjs'

// !!!! ATTENTION !!!!
// every validator function should return a Promise, and `resolve()` when value is valid, `reject(new Error('error detail'))` when value is invalid
// !!!! ATTENTION !!!!

/**
 * adapt to antd validator
 * @param fn as like `() => Mode.validate('someField')`
 */
export const adaptValidator = (
  fn: () => Promise<{ field: string; message: string }[] | string>
): ValidatorRule['validator'] => {
  return () => {
    return fn().then((errors) => {
      if (Array.isArray(errors) && errors.length) {
        return Promise.reject(errors[0].message)
      } else if (errors) {
        return Promise.reject(errors)
      }
      return Promise.resolve()
    })
  }
}

export const Required = (message = 'It is required.') => {
  return (value: any) => {
    if (typeof value === 'string') {
      value = value.trim()
    }
    if (value === undefined || value === null || value === '') {
      return Promise.reject(message)
    }
    return Promise.resolve()
  }
}

/**
 * range in [min, max] (min and max are included)
 */
export const Range = (min: number, max: number, message = `value should be ranged between ${min} and ${max}.`) => {
  return (value: any) => {
    if (typeof value === 'string') {
      value = value.trim()
    }
    if (value < min || value > max) {
      return Promise.reject(message)
    }
    return Promise.resolve()
  }
}

export const DateRange = ({
  start,
  end,
  earlyMessage,
  lateMessage
}: {
  start?: Dayjs
  end?: Dayjs
  earlyMessage?: string
  lateMessage?: string
}) => {
  return (value: Dayjs) => {
    if (start && value.isBefore(start)) {
      return Promise.reject(earlyMessage || `Date should be after ${start.format('YYYY-MM-DD')}.`)
    }
    if (end && value.isAfter(end)) {
      return Promise.reject(lateMessage || `Date should be before ${end.format('YYYY-MM-DD')}.`)
    }
    return Promise.resolve()
  }
}

/**
 * length in [min, max] (min and max are included)
 */
export const Length = (min: number, max: number, message = `The length should be between ${min} and ${max}.`) => {
  return (value: any) => {
    if (typeof value === 'string') {
      value = value.trim()
    }
    if (value.length < min || value.length > max) {
      return Promise.reject(message)
    }
    return Promise.resolve()
  }
}

export const Pattern = (pattern: RegExp, message = 'Incorrect pattern.') => {
  return (value: any) => {
    if (!pattern.test(value)) {
      return Promise.reject(message)
    }
    return Promise.resolve()
  }
}
