import { type SerdeableClass } from '@/model/Serde'

export interface Deriver<T extends SerdeableClass> {
  (cls: T): void | T
}

export default function <T extends SerdeableClass>(...derivers: Deriver<T>[]) {
  return function (cls: T) {
    for (const deriver of derivers) {
      cls = deriver(cls) ?? cls
    }
    return cls
  }
}
