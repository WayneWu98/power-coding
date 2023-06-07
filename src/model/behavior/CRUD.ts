/**
 * this file is used to restrict the behavior of a model to be CRUD,
 * and provide a deriver function to implement this behavior, it should be used with `@Derive` decorator.
 */

import { ClassConstructor } from 'class-transformer'
import BaseModel from '../BaseModel'
import { isDataMethod, isParamsMethod, requestModel } from '@/utils/request'

type Action = 'get' | 'create' | 'update' | 'delete'

export default abstract class CRUD<Get = any, Create = Get, Update = any, Delete = any> {
  get(): Promise<Response<Get>> {
    throw new Error('Method not implemented.')
  }
  create(): Promise<Response<Create>> {
    throw new Error('Method not implemented.')
  }
  update(): Promise<Response<Update>> {
    throw new Error('Method not implemented.')
  }
  delete(): Promise<Response<Delete>> {
    throw new Error('Method not implemented.')
  }
}

type EndPoint<T extends Object> = string | ((action: Action, model: T) => string)

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
 * @CRUDDeriver('/users')
 * class User extends BaseModel implements Entity {
 *    id: number
 * }
 * ```
 */
export function CRUDDeriver<T extends BaseModel>(
  endpoint: EndPoint<T>,
  actions: Action[] = ['get', 'create', 'update', 'delete']
) {
  return function (cls: ClassConstructor<T>) {
    const getEndpoint = (action: Action, model: T) => {
      if (typeof endpoint === 'string') {
        if (['create'].includes(action) || !Reflect.has(model, 'id')) {
          return endpoint
        }
        if (['get', 'delete', 'update'].includes(action)) {
          // @ts-ignore
          return `${endpoint}/${model.id}`
        }
        throw new Error('Action not implemented.')
      } else {
        return endpoint(action, model)
      }
    }
    const action2method = {
      get: 'get',
      create: 'post',
      update: 'put',
      delete: 'delete'
    } as const
    for (const action of actions) {
      cls.prototype[action] = function () {
        const method = action2method[action]
        if (!method) {
          throw new Error(`Action ${action} not implemented.`)
        }
        if (isParamsMethod(method)) {
          return requestModel[method](
            getEndpoint(action, this),
            this.query ?? {},
            {},
            Reflect.getPrototypeOf(this)!.constructor as typeof BaseModel
          )
        } else if (isDataMethod(method)) {
          return requestModel[method](
            getEndpoint(action, this),
            this,
            { params: this.query ?? {} },
            Reflect.getPrototypeOf(this)!.constructor as typeof BaseModel
          )
        }
      }
    }
  }
}
