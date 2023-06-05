import Axios, { AxiosRequestConfig, Method } from 'axios'
import BaseModel from '@/model/BaseModel'
import * as storage from '@/utils/storage'
import useUserStore from '@/store/user'

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
  (res) => res.data ?? {},
  (err) => {
    const data = err?.response?.data ?? {}
    if (data.meta?.code === 401) {
      useUserStore().logout()
    }
    throw err
  }
)

export enum DataMethod {
  POST = 'post',
  PUT = 'put',
  PATCH = 'patch'
}

export const isDataMethod = (method: Method): method is DataMethod => {
  return [DataMethod.POST, DataMethod.PUT, DataMethod.PATCH].includes(method as DataMethod)
}

function createModelDataRequest(method: DataMethod) {
  return function <T extends typeof BaseModel>(url: string, data: any, config: AxiosRequestConfig = {}, cls: T) {
    return request<any, Response<Object>>({
      url,
      method,
      data,
      ...config
    }).then(({ meta, data }) => ({ meta, data: cls.from(data) }))
  }
}

export enum ParamsMethod {
  GET = 'get',
  DELETE = 'delete'
}

export const isParamsMethod = (method: Method): method is ParamsMethod => {
  return [ParamsMethod.GET, ParamsMethod.DELETE].includes(method as ParamsMethod)
}

function createModelParamsRequest(method: ParamsMethod) {
  return function <T extends typeof BaseModel>(url: string, params: any, config: AxiosRequestConfig = {}, cls: T) {
    return request<any, Response<Object>>({
      url,
      method,
      params,
      ...config
    }).then(({ meta, data }) => ({ meta, data: cls.from(data) }))
  }
}

const requestModel = {
  get: createModelParamsRequest(ParamsMethod.GET),
  post: createModelDataRequest(DataMethod.POST),
  put: createModelDataRequest(DataMethod.PUT),
  delete: createModelParamsRequest(ParamsMethod.DELETE),
  patch: createModelDataRequest(DataMethod.PATCH)
}

export { request, requestModel }
