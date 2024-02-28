import Model from '@/decorator/Model'
import Serde from './Serde'
import { SortOrder } from 'ant-design-vue/lib/table/interface'

@Model()
export default class Sorter {
  orderBy: string
  order: SortOrder
}

export default interface Sorter extends Serde {}
