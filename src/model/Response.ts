import Model from '@/decorator/Model'
import BaseModel from './BaseModel'
import Field from '@/decorator/Field'

/**
 * Response Model is only used for unsuccessful response, it allow us to handle error in a unified way.
 */
@Model()
export default class Response extends BaseModel {
  @Field()
  private meta: { code: number; message: string; caused?: any } = { code: 200, message: 'success' }

  get code() {
    return this.meta.code
  }
  get message() {
    return this.meta.message ?? this.meta.caused?.message
  }
  get caused() {
    return this.meta.caused
  }

  static fromCaused(caused: any) {
    return Response.from({ meta: { code: 400, message: caused?.message, caused } })
  }
}
