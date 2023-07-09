import BaseModel from '@/model/BaseModel'

export interface Deriver<T extends typeof BaseModel> {
  (cls: T): void | T
}

export default function <T extends typeof BaseModel>(...derivers: Deriver<T>[]) {
  return function (cls: T) {
    for (const deriver of derivers) {
      cls = deriver(cls) ?? cls
    }
    return cls
  }
}
