import BaseModel from '@/model/BaseModel'
import { ClassConstructor } from 'class-transformer'

export interface Deriver<T extends BaseModel> {
  (cls: ClassConstructor<T>): void
}

export default function <T extends BaseModel>(...derivers: Deriver<T>[]) {
  return function (cls: ClassConstructor<T>) {
    derivers.forEach((deriver) => deriver(cls))
  }
}
