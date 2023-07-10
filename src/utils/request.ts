import Axios, { AxiosRequestConfig } from 'axios'
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

function createModelDataRequest(method: DataMethod) {
  return function <T extends typeof BaseModel>(url: string, data: any, config: AxiosRequestConfig = {}, cls: T) {
    return request<any, ApiResponse<Object>>({
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

function createModelParamsRequest(method: ParamsMethod) {
  return function <T extends typeof BaseModel>(url: string, params: any, config: AxiosRequestConfig = {}, cls: T) {
    return request<any, ApiResponse<Object>>({
      url,
      method,
      params,
      ...config
    }).then(({ meta, data }) => ({ meta, data: cls.from(data) } as ApiResponse<InstanceType<T>>))
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
