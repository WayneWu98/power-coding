import Model from '@/decorator/Model'
import BaseModel from './BaseModel'
import Derive from '@/decorator/Derive'
import CRUD, { CRUDDeriver } from './behavior/CRUD'
import Entity from './behavior/Entity'
import Pagination from './Pagination'
import Field from '@/decorator/Field'
import Query from './behavior/Query'
import { request, requestModel } from '@/utils/request'
import Validator, { Validatable } from '@/decorator/Validator'
import { Pattern, Required } from '@/utils/validator'
import * as storage from '@/utils/storage'
import Sorter from './Sorter'
import dayjs, { Dayjs } from 'dayjs'
import PageableList, { PageableListDeriver } from './behavior/PageableList'
import ScrollableList, { ScrollableListDeriver } from './behavior/ScrollableList'
import ApiResponse from './ApiResponse'
import { ApiFeedbackable } from '@/decorator/Feedbackable'

@Model({})
@Derive(CRUDDeriver('api/users'))
export class User extends BaseModel implements Entity<number> {
  @Field({ name: '用户ID', tableColumn: { align: 'center', sorter: true, customFilterDropdown: true } })
  id: number
  @Field({ name: '用户名', tableColumn: { align: 'center' } })
  name: string
  @Field({ name: '邮箱', tableColumn: { align: 'center' } })
  email: string
  @Field({ name: '年龄', tableColumn: { align: 'center', sorter: true } })
  age: number
  @Field({ ignore: { onDeserialize: true } })
  password?: string

  static getMyUser() {
    return requestModel.get('/api/users/me', {}, {}, User)
  }
}

export interface User extends CRUD<User> {}

@Model()
export class UserAuth extends BaseModel {
  @Field({ name: '邮箱', description: '邮箱地址' })
  @Validator(Required('请输入邮箱'), Pattern(/^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/, '请输入正确的邮箱地址'))
  email: string

  @Field({ name: '密码', description: '密码(包含数字、大小写字母)' })
  @Validator(Required('请输入密码'))
  password: string

  @Validatable()
  @ApiFeedbackable.default({ 404: 'User does not exist' }, 'Login Success')
  login() {
    return request.post<any, ApiResponse<{ token: string }>>('/api/login', this).then((res) => {
      storage.setItem('token', res.data.token)
      return res
    })
  }
}

@Model()
export class UsersQuery extends BaseModel {
  @Field({ flatOnSerialize: true })
  pagination: Pagination = Pagination.default()
  @Field({ flatOnSerialize: true })
  sorter: Sorter = Sorter.default()
  @Field({ flatOnSerialize: true, transform: { onSerialize: (value) => ({ id: value.id?.[0] }) } })
  filters: Record<string, any> = {}
  @Field({
    flatOnSerialize: true,
    transform: {
      onSerialize(value: [Dayjs, Dayjs]) {
        return { startDate: value[0].format('YYYY-MM-DD'), endDate: value[1].format('YYYY-MM-DD') }
      },
      onDeserialize(value: { startDate: string; endDate: string }) {
        return [dayjs(value.startDate), dayjs(value.endDate)]
      }
    }
  })
  dateRange: [Dayjs, Dayjs] = [dayjs(), dayjs()]
}

@Model()
@Derive(CRUDDeriver('api/users', ['get']), PageableListDeriver({ itemType: User }))
export class PageableUsers extends BaseModel implements Query<UsersQuery> {
  // query only for serialization as request params
  @Field({ ignore: { onDeserialize: true } })
  query: UsersQuery = UsersQuery.default()
}

// for type check, we should declare a interface named as same as the class's, and extends the behavior class
export interface PageableUsers extends CRUD<PageableUsers>, PageableList<User> {}

@Model()
@Derive(CRUDDeriver('api/users', ['get']), ScrollableListDeriver({ itemType: User }))
export class ScrollableUsers extends BaseModel implements Query<UsersQuery> {
  // query only for serialization as request params
  @Field({ ignore: { onDeserialize: true } })
  query: UsersQuery = UsersQuery.default()
}

// for type check, we should declare a interface named as same as the class's, and extends the behavior class
export interface ScrollableUsers extends CRUD<ScrollableUsers>, ScrollableList<User> {}
