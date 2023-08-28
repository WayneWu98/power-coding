import { message } from 'ant-design-vue'

type ApiMessage = undefined | string | Record<number, string> | ((res?: any) => string | undefined)

const getApiMessage = (msg?: ApiMessage, res?: any) => {
  if (typeof msg === 'string') {
    return msg
  }
  if (typeof msg === 'function') {
    return msg(res)
  }
  return msg?.[res?.meta?.code]
}

const mergeApiMessage = (msg1: ApiMessage, msg2: ApiMessage) => {
  return (res?: any) => getApiMessage(msg1, res) || getApiMessage(msg2, res)
}

export function ApiFeedbackable(failMessage?: ApiMessage, successMessage?: ApiMessage) {
  return function (
    _target: object,
    _key: string | symbol,
    descriptor: TypedPropertyDescriptor<(...args: any[]) => Promise<any>>
  ) {
    const originalMethod = descriptor.value!
    descriptor.value = function (...args: any[]) {
      return ApiFeedbackable.handle(() => originalMethod.apply(this, args), failMessage, successMessage)
    }
  }
}

export const DEFAULT_API_FAIL_MESSAGE = {
  401: 'Unauthorized',
  403: 'No Permission',
  404: 'Not Found'
}
export const DEFAULT_API_SUCCESS_MESSAGE = {
  0: 'Success'
}

ApiFeedbackable.default = function (failFallbackMessage?: ApiMessage, successFallbackMessage?: ApiMessage) {
  const mergedFailMessage =
    typeof failFallbackMessage === 'string'
      ? mergeApiMessage(DEFAULT_API_FAIL_MESSAGE, failFallbackMessage)
      : mergeApiMessage(failFallbackMessage, DEFAULT_API_FAIL_MESSAGE)
  const mergedSuccessMessage =
    typeof successFallbackMessage === 'string'
      ? mergeApiMessage(DEFAULT_API_SUCCESS_MESSAGE, successFallbackMessage)
      : successFallbackMessage
  return ApiFeedbackable(mergedFailMessage, mergedSuccessMessage)
}

ApiFeedbackable.handle = function (fn: () => Promise<any>, failMessage?: ApiMessage, successMessage?: ApiMessage) {
  return fn()
    .then((res) => {
      const msg = getApiMessage(successMessage, res)
      if (msg) message.success({ content: msg })
      return res
    })
    .catch((err) => {
      const msg = getApiMessage(failMessage, err)
      if (msg) message.error({ content: msg })
      throw err
    })
}
