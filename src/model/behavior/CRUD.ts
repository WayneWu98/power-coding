/**
 * this file is used to restrict the behavior of a model to be CRUD,
 * and provide a deriver function to implement this behavior, it should be used with `@Derive` decorator.
 */

import { ClassConstructor } from 'class-transformer'
import BaseModel from '../BaseModel'
import { isDataMethod, isParamsMethod, requestModel } from '@/utils/request'

type Action = 'get' | 'create' | 'update' | 'delete'

export default abstract class CRUD<Get = any, Create = Get, Update = any, Delete = any> {
  get: () => Promise<Response<Get>>
  create: () => Promise<Response<Create>>
  update: () => Promise<Response<Update>>
  delete: () => Promise<Response<Delete>>
}

type EndPoint<T extends Object> = string | ((action: Action, model: T) => string)

const UNIMPLEMENTED = {
  get: () => {
    throw new Error('Action GET not implemented.')
  },
  create: () => {
    throw new Error('Action CREATE not implemented.')
  },
  update: () => {
    throw new Error('Action UPDATE not implemented.')
  },
  delete: () => {
    throw new Error('Action DELETE not implemented.')
  }
} as Record<Action, Function>

const ALL_ACTIONS: Action[] = ['get', 'create', 'update', 'delete']

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
export function CRUDDeriver<T extends typeof BaseModel & ClassConstructor<CRUD<R>>, R extends BaseModel>(
  endpoint: EndPoint<R>,
  actions: Action[] = ALL_ACTIONS
) {
  return function (cls: T) {
    const getEndpoint = (action: Action, model: R) => {
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
    for (const action of ALL_ACTIONS) {
      if (!actions.includes(action)) {
        cls.prototype[action] = UNIMPLEMENTED[action]
        continue
      }
      cls.prototype[action] = function () {
        const method = action2method[action]
        if (isParamsMethod(method)) {
          return requestModel[method](
            getEndpoint(action, this),
            this.query ?? {},
            {},
            Reflect.getPrototypeOf(this)!.constructor as typeof BaseModel
          )
        }
        if (isDataMethod(method)) {
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
