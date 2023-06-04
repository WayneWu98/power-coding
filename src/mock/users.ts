import { MockMethod } from 'vite-plugin-mock'
import Mock from 'mockjs'
import Response from './utils/response'
import usersData from './data/users'
import { verify } from './utils/jwt'

export default [
  {
    url: '/api/users',
    method: 'get',
    response({ headers, query }) {
      const verified = verify(headers.authorization)
      if (!verified) {
        this.res.statusCode = 401
        return Response.unauthorized()
      }
      if (verified.role !== 'admin') {
        this.res.statusCode = 403
        return Response.forbidden()
      }
      const { page = 1, per = 10 } = query
      const { list } = Mock.mock({
        'list|100': [
          {
            'id|+1': 1,
            name: '@cname',
            email: '@email',
            'role|1': ['admin', 'user']
          }
        ]
      })
      return Response.success({ items: list.slice((page - 1) * per, page * per), total: list.length })
    }
  },
  {
    url: '/api/users',
    method: 'post',
    response({ headers, body }) {
      if (verify(headers.authorization)?.role !== 'admin') {
        return Response.forbidden()
      }
      const id = [...usersData].sort((a, b) => b.id - a.id)[0].id + 1
      const user = Object.assign(body, { id })
      // @ts-ignore
      usersData.unshift(user)
      return Response.success(user)
    }
  },
  {
    url: '/api/users/:id',
    method: 'get',
    response({ url, headers }) {
      const verified = verify(headers.authorization)
      if (!verified) {
        this.res.statusCode = 401
        return Response.unauthorized()
      }
      const id = url.match(/\/api\/users\/(\w+)/)?.[1]
      let user
      if (id === 'me') {
        user = usersData.find((user) => user.email === verified.email)
      } else {
        user = usersData.find((user) => user.id === +id!)
      }
      if (!user) {
        this.res.statusCode = 404
        return Response.notFound()
      }
      if (user.email !== verified.email && verified.role !== 'admin') {
        this.res.statusCode = 403
        return Response.forbidden()
      }
      return Response.success(user)
    }
  },
  {
    url: '/api/users/:id',
    method: 'put',
    response({ url, headers, body }) {
      const verified = verify(headers.authorization)
      if (!verified) {
        this.res.statusCode = 401
        return Response.unauthorized()
      }
      const id = url.match(/\/api\/users\/(\d+)/)?.[1]
      const user = usersData.find((user) => user.id === +id!)
      if (!user) {
        this.res.statusCode = 404
        return Response.notFound()
      }
      if (user.email !== verified.email && verified.role !== 'admin') {
        this.res.statusCode = 403
        return Response.forbidden()
      }
      Object.assign(user, body)
      return Response.success(user)
    }
  },
  {
    url: '/api/users/:id',
    method: 'delete',
    response({ url, headers, body }) {
      const verified = verify(headers.authorization)
      if (!verified) {
        this.res.statusCode = 401
        return Response.unauthorized()
      }
      if (verified.role !== 'admin') {
        this.res.statusCode = 403
        return Response.forbidden()
      }
      const id = url.match(/\/api\/users\/(\d+)/)?.[1]
      const user = usersData.findIndex((user) => user.id === +id!)
      if (user < 0) {
        this.res.statusCode = 404
        return Response.notFound()
      }
      usersData.splice(user, 1)
      return Response.success()
    }
  }
] as MockMethod[]
