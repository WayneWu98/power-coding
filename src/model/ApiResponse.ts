import BaseModel from './BaseModel'
import Field from '@/decorator/Field'

export default class ApiResponse<T> {
  meta: {
    code: number
    message: string
  }
  @Field({ ignore: true })
  data: T

  static from<T>(res: ApiResponse<T>): ApiResponse<T>
  static from<T, M extends typeof BaseModel>(res: ApiResponse<T>, cls: M): ApiResponse<M>
  static from<T, M extends typeof BaseModel>(res: ApiResponse<T>, cls?: M) {
    if (cls) {
      // @ts-ignore
      const instance = BaseModel.from.apply(this, res) as ApiResponse<InstanceType<M>>
      instance.data = cls.from(res.data)
      return instance
    }
    // @ts-ignore
    const instance = BaseModel.from.apply(this, res) as ApiResponse<T>
    instance.data = res.data
    return instance
  }
}
