// import jwt, { JwtPayload } from 'jsonwebtoken'

interface JwtPayload {
  email: string
  role: string
}

// mock jwt, it is not safe, just for demo
const jwt = {
  sign<T extends Object>(payload: T, _secret: string, options: { expiresIn: number }) {
    return encodeURIComponent(JSON.stringify({ ...payload, exp: Date.now() + options.expiresIn * 1000 }))
  },
  verify(token: string, _secret: string) {
    const payload = JSON.parse(decodeURIComponent(token))
    if (payload.exp < Date.now()) {
      throw new Error('jwt expired')
    }
    return payload
  }
}

const SECRET = 'secret'
// expire in 2 hour
const EXPIRES_IN = 60 * 60 * 2

export function sign(email: string, role: string) {
  return jwt.sign({ email, role }, SECRET, { expiresIn: EXPIRES_IN })
}

export function verify(token: string) {
  try {
    return jwt.verify(token, SECRET) as JwtPayload
  } catch (err) {
    return undefined
  }
}

export function verifyFromHeader(header: string) {
  const token = header.split(' ')[1]
  return verify(token)
}
