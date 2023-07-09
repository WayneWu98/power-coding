/**
 * this file is used to restrict the behavior of a model to be loadable in a table,
 * and provide a deriver function to implement this behavior, it should be used with `@Derive` decorator.
 *
 * the structure of the list data should be: `{ items: Item[]; total: number }`
 */

import { ClassConstructor } from 'class-transformer'
import BaseModel from '../BaseModel'
import CRUD from './CRUD'
import Field from '@/decorator/Field'
import Query from './Query'
import Pagination from '../Pagination'

export default abstract class PageableList<T> {
  total: number = 0
  isEnd: boolean = false
  loading: boolean = false
  items: T[] = []
  next: () => Promise<any>
  prev: () => Promise<any>
  /**
   * reload data of current page
   */
  reload: () => Promise<any>
  goto: (page: number) => Promise<void>
  /**
   * back to the first page, this is a shortcut for `goto(1)`
   */
  refresh: () => Promise<any>
}

type ModelConstraint<T> = BaseModel & CRUD<T> & PageableList<any> & Query<{ pagination: Pagination }>

async function goto<T extends PageableList<any>>(this: ModelConstraint<T>, page: number) {
  if (this.loading) return
  this.loading = true
  this.query.pagination.page = page
  try {
    const { data } = await this.get()
    this.merge(data, ['items', 'total'])
    const exists = this.items.length + this.query.pagination.per * (this.query.pagination.page - 1)
    this.isEnd = exists >= this.total
  } finally {
    this.loading = false
  }
}
async function next<T>(this: ModelConstraint<T>) {
  if (this.isEnd) return
  return this.goto(this.query.pagination.page + 1)
}
async function prev<T>(this: ModelConstraint<T>) {
  if (this.query.pagination.page === 1) return
  return this.goto(this.query.pagination.page - 1)
}
async function reload<T>(this: ModelConstraint<T>) {
  return this.goto(this.query.pagination.page)
}
function refresh<T>(this: ModelConstraint<T>) {
  return this.goto(1)
}

/**
 * this is a deriver to implement `PageableList` behavior for a model,
 * it requires the model which would derive `PageableList` should implement CRUD behavior
 * and Query<{ pagination: Pagination }> behavior.
 *
 * PageableList is conflict with ScrollableList, so you can only use one of them.
 *
 * @example
 *
 * ```typescript
 * class UsersQuery extends BaseModel {
 *  pagination: Pagination = Pagination.default()
 * }
 *
 * @Derive(CRUDDeriver('api/users'), PageableListDeriver(User))
 * class Users extends BaseModel implements Entity {
 *   query: Query<{ pagination: Pagination }> = UsersQuery.default()
 * }
 * interface Users extends CRUD<Users>, PageableList<User> {}
 * ```
 */
export function PageableListDeriver<
  T extends typeof BaseModel & ClassConstructor<PageableList<any> & CRUD<PageableList<R>>>,
  R extends BaseModel
>(itemType: ClassConstructor<R>) {
  return function (cls: T) {
    Field({ type: itemType })(cls.prototype, 'items')
    Field({ type: Number, ignore: { onSerialize: true } })(cls.prototype, 'total')
    Field({ type: Boolean, ignore: true })(cls.prototype, 'loading')
    Field({ type: Boolean, ignore: true })(cls.prototype, 'isEnd')
    // @ts-ignore
    return class extends cls {
      total: number = 0
      isEnd: boolean = false
      loading: boolean = false
      items: R[] = []
      next = next
      prev = prev
      goto = goto
      reload = reload
      refresh = refresh
    }
  }
}
