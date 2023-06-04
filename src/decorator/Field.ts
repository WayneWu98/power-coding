import { ClassConstructor, Expose, Transform, TransformFnParams } from 'class-transformer'
import 'reflect-metadata'
import { typeTransformer } from '@/utils/transformer'
import { TableColumnType } from 'ant-design-vue'

type ExcludedBuiltInProps = 'sorter' | 'filtered' | 'sortOrder'
interface TableColumn extends Omit<TableColumnType, ExcludedBuiltInProps> {
  sorter?: boolean
}

export interface Field {
  name?: string
  fieldName?: string
  description?: string
  type?: any
  tableColumn?: TableColumn
  transform?: (params: TransformFnParams) => any
  /**
   * @property {boolean} onDeserialize ignore current field when deserialization
   * @property {boolean} onSerialize ignore current field when serialization
   */
  ignore?: { onDeserialize?: boolean; onSerialize?: boolean } | boolean
  /**
   * flat object key-value and append to its parent object when serialization
   */
  flatOnSerialize?: boolean
  /**
   * nest object key-values to current field when deserialization
   */
  nestOnDeserialize?: boolean
}

const FIELD_KEY = Symbol('FIELD')
const FIELDS_KEY = Symbol('FIELDS')
const SHOULD_NEST_FIELDS_KEY = Symbol('SHOULD_NEST_FIELDS')

export function getShouldNestFields<T extends ClassConstructor<any>>(cls: T): (keyof InstanceType<T>)[] {
  return Reflect.getMetadata(SHOULD_NEST_FIELDS_KEY, cls) || []
}

export function getFieldList<T extends ClassConstructor<any>>(cls: T): (keyof InstanceType<T>)[] {
  return Reflect.getMetadata(FIELDS_KEY, cls) || []
}

function addFieldItem<T extends ClassConstructor<any>>(cls: T, field: keyof InstanceType<T>) {
  Reflect.defineMetadata(FIELDS_KEY, [...new Set([...getFieldList(cls), field])], cls)
}

function addShouldNestFieldItem<T extends ClassConstructor<any>>(cls: T, field: keyof InstanceType<T>) {
  Reflect.defineMetadata(SHOULD_NEST_FIELDS_KEY, [...new Set([...getShouldNestFields(cls), field])], cls)
}

export function getField<T extends ClassConstructor<any>>(cls: T, field: keyof InstanceType<T>): Field {
  return Reflect.getMetadata(FIELD_KEY, cls.prototype, field as string)
}

export function getFields<T extends ClassConstructor<any>>(cls: T): Record<keyof InstanceType<T>, Field> {
  return getFieldList(cls).reduce((map, field) => {
    map[field] = getField(cls, field)
    return map
  }, {} as Record<keyof InstanceType<T>, Field>)
}

export default function (conf: Field = {}) {
  return function (prototype: Object, propertyKey: string | symbol) {
    if (!Reflect.has(conf, 'type')) {
      conf.type = Reflect.getMetadata('design:type', prototype, propertyKey)
    }
    if (conf.nestOnDeserialize) {
      addShouldNestFieldItem(prototype.constructor as ClassConstructor<any>, propertyKey)
    }
    addFieldItem(prototype.constructor as ClassConstructor<any>, propertyKey)
    Reflect.defineMetadata(FIELD_KEY, conf, prototype, propertyKey)
    if (!Reflect.has(conf, 'transform')) {
      Transform(typeTransformer(conf.type))(prototype, propertyKey)
    } else {
      Transform(conf.transform!)(prototype, propertyKey)
    }
    if (conf.fieldName) {
      Expose({ name: conf.fieldName })(prototype, propertyKey)
    }
  }
}
