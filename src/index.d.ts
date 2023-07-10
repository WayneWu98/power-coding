interface ApiResponse<T> {
  meta: {
    code: number
    message: string
  }
  data: T
}