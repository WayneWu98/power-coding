import Model from '@/decorator/Model'
import BaseModel from './BaseModel'

@Model()
export default class Pagination extends BaseModel {
  page: number = 1
  per: number = 10
}
