import 'reflect-metadata'
import { NamingCase } from '@/utils/naming-case'
import { DEFAULT_PLAIN_NAMING_CASE } from '@/config'
import Serde, { serdeable } from '@/model/Serde'

export interface Model {
  name?: string
  rename?: NamingCase
}

const MODEL_KEY = Symbol('MODEL')

export default function (conf: Model = {}) {
  if (!Reflect.has(conf, 'rename')) {
    conf.rename = DEFAULT_PLAIN_NAMING_CASE
  }
  return (target: Function) => {
    Object.getOwnPropertyNames(Serde.prototype).forEach((property) => {
      if (property === 'constructor') return
      // @ts-ignore
      target.prototype[property] = Serde.prototype[property]
    })
    target.prototype[serdeable] = true
    Reflect.metadata(MODEL_KEY, conf)(target)
  }
}

export function getModel(cls: Object): Model {
  return Reflect.getMetadata(MODEL_KEY, cls)
}
