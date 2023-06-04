import Axios, { AxiosRequestConfig, Method } from 'axios'
import BaseModel from '@/model/BaseModel'
import * as storage from '@/utils/storage'
import useUserStore from '@/store/user'
import Response from '@/model/Response'

const request = Axios.create({
  // baseURL: import.meta.env.VITE_APP_BASE_API,
  validateStatus: (status) => [200].includes(status)
})

request.interceptors.request.use((config) => {
  if (config.params instanceof BaseModel) {
    config.params = config.params.toPlain()
  }
  if (config.data instanceof BaseModel) {
    config.data = config.data.toPlain()
  }
  config.headers['Authorization'] = storage.getItem('token')
  return config
})

request.interceptors.response.use(
  (res) => res.data?.data ?? {},
  (err) => {
    const data = err?.response?.data
    if (data) {
      const res = Response.from(data)
      if (res.code === 401) {
        useUserStore().logout()
      }
      throw res
    }
    throw Response.fromCaused(err)
  }
)

function createModelRequest(method: Method) {
  return function <T extends typeof BaseModel>(url: string, config: AxiosRequestConfig = {}, cls: T) {
    return request({
      url,
      method,
      ...config
    }).then<InstanceType<T>>((data) => cls.from(data))
  }
}

const requestModel = {
  get: createModelRequest('get'),
  post: createModelRequest('post'),
  put: createModelRequest('put'),
  delete: createModelRequest('delete'),
  patch: createModelRequest('patch')
}

export { request, requestModel }
