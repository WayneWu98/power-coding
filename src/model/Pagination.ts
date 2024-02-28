import Model from '@/decorator/Model'
import Serde from './Serde'

@Model()
export default class Pagination {
  page: number = 1
  per: number = 10
}

export default interface Pagination extends Serde {}
