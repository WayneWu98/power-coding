interface ApiResponse<T> {
  meta: {
    code: number
    message: string
  }
  data: T
}

type NonFunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? never : K
}[keyof T]
type OptionalPropertyNames<T> = {
  [K in keyof T]-?: undefined extends T[K] ? K : never
}[keyof T]
type RequiredPropertyNames<T extends object> = Exclude<keyof T, OptionalPropertyNames<T>>
type RequiredPropertyRecord<T> = T extends object ? { [K in RequiredPropertyNames<T>]-?: T[K] } : T
type OptionalPropertyRecord<T> = T extends object ? { [K in OptionalPropertyNames<T>]+?: T[K] } : T
type NonFunctionRequiredRecord<T> = T extends object
  ? {
      [K in NonFunctionPropertyNames<T>]-?: NonFunctionRecord<T[K]>
    }
  : T
type NonFunctionOptionalRecord<T> = T extends object
  ? {
      [K in NonFunctionPropertyNames<T>]+?: NonFunctionRecord<T[K]>
    }
  : T
type NonFunctionRecord<T> = T extends any[]
  ? NonFunctionRecord<T[number]>[]
  : T extends object
  ? NonFunctionOptionalRecord<OptionalPropertyRecord<T>> & NonFunctionRequiredRecord<RequiredPropertyRecord<T>>
  : T
