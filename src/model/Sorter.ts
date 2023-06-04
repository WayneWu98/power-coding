import Model from '@/decorator/Model'
import BaseModel from './BaseModel'
import { SortOrder } from 'ant-design-vue/lib/table/interface'

@Model()
export default class Sorter extends BaseModel {
  orderBy: string
  order: SortOrder
}
