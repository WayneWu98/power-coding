/**
 * this file is used to restrict the behavior of a model to be loadable in a scrollable list,
 * and provide a deriver function to implement this behavior, it should be used with `@Derive` decorator.
 *
 * the structure of the list data should be: `{ items: Item[]; total: number }`
 */

import { ClassConstructor } from 'class-transformer'
import BaseModel from '../BaseModel'
import Pagination from '../Pagination'
import CRUD from './CRUD'
import Query from './Query'
import Field from '@/decorator/Field'

export default abstract class ScrollableList<T> {
  total: number
  isEnd: boolean
  loading: boolean
  items: T[]
  loadMore: () => Promise<void>
  /**
   * back to the first page
   */
  refresh: () => Promise<void>
}

/**
 * this is a deriver to implement `ScrollableList` behavior for a model,
 * it requires the model which would derive `ScrollableList` should implement CRUD behavior
 * and Query<{ pagination: Pagination }> behavior.
 *
 * ScrollableList is conflict with PageableList, so you can only use one of them.
 *
 * @example
 *
 * ```typescript
 * class UsersQuery extends BaseModel {
 *  pagination: Pagination = Pagination.default()
 * }
 *
 * @Derive(CRUDDeriver('api/users'), ScrollableListDeriver(User))
 * class Users extends BaseModel implements Entity {
 *   query: Query<{ pagination: Pagination }> = UsersQuery.default()
 * }
 * interface Users extends CRUD<Users>, ScrollableList<User> {}
 * ```
 */
export function ScrollableListDeriver<
  T extends typeof BaseModel &
    ClassConstructor<ScrollableList<any> & CRUD<ScrollableList<R>> & Query<{ pagination: Pagination }>>,
  R extends BaseModel
>(itemType: ClassConstructor<R>) {
  return function (cls: T) {
    Field({ type: itemType })(cls.prototype, 'items')
    Field({ type: Number, ignore: { onSerialize: true } })(cls.prototype, 'total')
    Field({ type: Boolean, ignore: true })(cls.prototype, 'loading')
    Field({ type: Boolean, ignore: true })(cls.prototype, 'isEnd')
    // @ts-ignore
    return class extends cls implements ScrollableList<R> {
      total: number = 0
      isEnd: boolean = false
      loading: boolean = false
      items: R[] = []
      // @ts-ignore
      async loadMore() {
        if (this.isEnd || this.loading) return
        this.query.pagination.page += 1
        this.loading = true
        try {
          const { data } = await this.get()
          this.items.push(...data.items)
          this.total = data.total
          this.isEnd = this.items.length >= this.total
        } finally {
          this.loading = false
        }
      }
      // @ts-ignore
      async refresh() {
        if (this.loading) return
        this.loading = true
        this.query.pagination.page = 1
        try {
          const { data } = await this.get()
          this.merge(data, ['items', 'total'])
          this.isEnd = this.items.length >= this.total
        } finally {
          this.loading = false
        }
      }
    }
  }
}
