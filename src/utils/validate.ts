import { Op } from '../types'

const validChars = /^[a-zA-Z0-9-_]+$/

export const isValidOpName = ({ name }: Op) =>
  typeof name === 'string' && validChars.test(name)

// RFCC 5322 official standard to validate emails
export const validateEmail = (email: string): boolean => {
  return /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
    email,
  )
}
