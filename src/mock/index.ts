import usersData from './data/users'
import Response from './utils/response'
import { sign } from './utils/jwt'
import { MockMethod } from 'vite-plugin-mock'

export default [
  {
    url: '/api/login',
    method: 'post',
    response({ body }) {
      const { email, password } = body
      const user = usersData.find((user) => user.email === email)
      if (!user) {
        return Response.notFound()
      }
      if (user.password !== password) {
        this.res.statusCode = 400
        return Response.error(400, 'Wrong password')
      }
      return Response.success({ token: sign(user.email, user.role) })
    }
  }
] as MockMethod[]
