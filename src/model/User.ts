import Model from '@/decorator/Model'
import BaseModel from './BaseModel'
import Derive from '@/decorator/Derive'
import CRUD, { CRUDDeriver } from './behavior/CRUD'
import Entity from './behavior/Entity'
import Pagination from './Pagination'
import Field from '@/decorator/Field'
import Query from './behavior/Query'
import { request, requestModel } from '@/utils/request'
import Validator from '@/decorator/Validator'
import { Pattern, Required } from '@/utils/validator'
import * as storage from '@/utils/storage'
import Sorter from './Sorter'

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

  login() {
    return request
      .post<any, Response<{ token: string }>>('/api/login', this)
      .then(({ data }) => storage.setItem('token', data.token))
  }
}

@Model()
export class UsersQuery extends BaseModel {
  @Field({ flatOnSerialize: true, nestOnDeserialize: true })
  pagination: Pagination = Pagination.default()
  @Field({ flatOnSerialize: true, nestOnDeserialize: true })
  sorter: Sorter = Sorter.default()
  @Field({ flatOnSerialize: true, nestOnDeserialize: true })
  filters: Record<string, any> = {}
}

@Model()
@Derive(CRUDDeriver('api/users', ['get']))
export class Users extends BaseModel implements Query {
  @Field({})
  query: UsersQuery = UsersQuery.default()
  @Field({ type: User })
  items: User[] = []

  @Field()
  total: number = 0
}

// for type check, we should declare a interface named as same as the class's, and extends the behavior class
export interface Users extends CRUD<Users> {}
