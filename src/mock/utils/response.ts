interface Meta {
  code: number
  message: string
}

function Response({ meta, data }: { meta?: Meta; data?: any } = {}) {
  return {
    meta: meta ?? { code: 0, message: 'success' },
    data
  }
}

Response.success = function (data?: any) {
  return this({ data })
}

Response.error = function (code: number, message: string) {
  return this({
    meta: {
      code,
      message
    }
  })
}

Response.forbidden = function () {
  return this.error(403, 'Forbidden')
}

Response.unauthorized = function () {
  return this.error(401, 'Unauthorized')
}

Response.notFound = function () {
  return this.error(404, 'Not Found')
}

export default Response
