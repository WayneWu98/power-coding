interface Response<T> {
  meta: {
    code: number
    message: string
  }
  data: T
}