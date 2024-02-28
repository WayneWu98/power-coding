import 'reflect-metadata'
import { NamingCase } from '@/utils/naming-case'
import { DEFAULT_PLAIN_NAMING_CASE } from '@/config'
import Serde, { serdeable } from '@/model/Serde'

export interface SerdeableConfig {
  name?: string
  rename?: NamingCase
}

const KEY = Symbol('SERDEABLE')

export default function (conf: SerdeableConfig = {}) {
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
    Reflect.metadata(KEY, conf)(target)
  }
}

export function getSerdeableConfig(cls: Object): SerdeableConfig {
  return Reflect.getMetadata(KEY, cls)
}
