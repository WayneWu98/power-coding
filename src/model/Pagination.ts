import Serdeable from '@/decorator/Serdeable'
import Serde from './Serde'

@Serdeable()
export default class Pagination {
  page: number = 1
  per: number = 10
}

export default interface Pagination extends Serde {}
