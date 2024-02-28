import Serdeable from '@/decorator/Serdeable'
import Serde from './Serde'
import { SortOrder } from 'ant-design-vue/lib/table/interface'

@Serdeable()
export default class Sorter {
  orderBy: string
  order: SortOrder
}

export default interface Sorter extends Serde {}
