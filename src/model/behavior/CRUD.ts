/**
 * this file is used to restrict the behavior of a model to be CRUD,
 * and provide a deriver function to implement this behavior, it should be used with `@Derive` decorator.
 */

import { ClassConstructor } from 'class-transformer'
import BaseModel from '../BaseModel'
import { requestModel } from '@/utils/request'
import { ApiFeedbackable, DEFAULT_API_FAIL_MESSAGE } from '@/decorator/Feedbackable'
import { message } from 'ant-design-vue'

type Action = 'get' | 'create' | 'update' | 'delete'

export default abstract class CRUD<Get = any, Create = Get, Update = any, Delete = any> {
  get: () => Promise<Get>
  create: () => Promise<Create>
  update: () => Promise<Update>
  delete: () => Promise<Delete>
}

type EndPoint<T extends object> = string | ((action: Action, model: T) => string)

interface DeriverOptions {
  validatable?: boolean
  feedbackable?: boolean
}

/**
 * this is a helper function to implement CRUD behavior for a model,
 * it assumes that the design standard of the backend is RESTful-based:
 *
 * - get a specific entity: `GET endpoint/:id`
 * - delete a specific entity: `endpoint/:id`
 * - create a new entity: `endpoint`
 * - update a specific entity `endpoint/:id`
 *
 * or model does not implement `Entity` (`id` is not existing), then all methods will use `endpoint` as the endpoint directly.
 *
 * or you can customize the endpoint by passing a function as the first argument,
 * this function receives two arguments: `action` and `model`, and returns a string as the endpoint
 *
 * @example
 *
 * ```typescript
 * @Derive(CRUDDeriver('api/users'))
 * class User extends BaseModel implements Entity {
 *   id: number
 * }
 *
 * interface User extends CRUD<User> {}
 * ```
 */
export function CRUDDeriver<T extends typeof BaseModel & ClassConstructor<CRUD<InstanceType<T>>>>(
  endpoint: EndPoint<InstanceType<T>>,
  actions: Action[] = ['get', 'create', 'update', 'delete'],
  { validatable, feedbackable }: DeriverOptions = {}
) {
  return function (cls: T) {
    const getEndpoint = (action: Action, model: InstanceType<T>) => {
      if (typeof endpoint === 'string') {
        if (['create'].includes(action) || !Reflect.has(model, 'id')) {
          return endpoint
        }
        if (['get', 'delete', 'update'].includes(action)) {
          // @ts-ignore
          return `${endpoint}/${model.id}`
        }
      } else {
        return endpoint(action, model)
      }
    }
    async function handle(this: BaseModel, fn: () => Promise<any>) {
      if (validatable) {
        await this.validate().then((errors) => {
          if (errors.length) {
            message.error({ content: errors[0].message })
            throw errors
          }
        })
      }
      if (feedbackable) return ApiFeedbackable.handle(fn, DEFAULT_API_FAIL_MESSAGE)
      return fn()
    }
    // @ts-ignore
    return class extends cls {
      // @ts-ignore
      get(this: R) {
        if (!actions.includes('get')) {
          throw new Error('Action GET not implemented.')
        }
        const constructor = Reflect.getPrototypeOf(this)!.constructor as T
        return handle.call(this, () => requestModel.get(getEndpoint('get', this)!, this.query ?? {}, {}, constructor))
      }
      // @ts-ignore
      create(this: R) {
        if (!actions.includes('create')) {
          throw new Error('Action CREATE not implemented.')
        }
        const constructor = Reflect.getPrototypeOf(this)!.constructor as T
        return handle.call(this, () =>
          requestModel.post(getEndpoint('create', this)!, this, { params: this.query ?? {} }, constructor)
        )
      }
      // @ts-ignore
      update(this: R) {
        if (!actions.includes('update')) {
          throw new Error('Action UPDATE not implemented.')
        }
        const constructor = Reflect.getPrototypeOf(this)!.constructor as T
        return handle.call(this, () =>
          requestModel.put(getEndpoint('update', this)!, this, { params: this.query ?? {} }, constructor)
        )
      }
      // @ts-ignore
      delete(this: R) {
        if (!actions.includes('delete')) {
          throw new Error('Action DELETE not implemented.')
        }
        const constructor = Reflect.getPrototypeOf(this)!.constructor as T
        return handle.call(this, () =>
          requestModel.delete(getEndpoint('delete', this)!, this.query ?? {}, {}, constructor)
        )
      }
    }
  }
}
