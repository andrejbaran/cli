import { Op } from '../types'

export const validChars = /^[a-zA-Z0-9-_]+$/
export const validCharsTeamName = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/

export const isValidOpName = ({ name }: Op) =>
  typeof name === 'string' && validChars.test(name)

// RFCC 5322 official standard to validate emails
export const validateEmail = (email: string): boolean => {
  return /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
    email,
  )
}

export const validatePasswordFormat = (input: string) => {
  if (input.length < 8)
    return `❗ This password is too short, please choose a password that is at least 8 characters long`
  return true
}

export const validateCpassword = (
  input: string,
  answers: { password: string },
): string | boolean => {
  if (input !== answers.password) {
    return `❗ Password doesn't match, please try again.`
  }
  return true
}
