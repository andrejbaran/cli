import { OpCommand, OpWorkflow } from '../types'

export const validChars = /^[a-zA-Z0-9-_]+$/
export const validCharsTeamName = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/
export const validVersionChars = /^[\w][\w.-]{0,127}$/
export const validOpsAddArg = /^@[a-z0-9]+([._-][a-z0-9]+)*\/[\w\d-_]+\:*([\w.-])*$/

export const isValidOpName = (opName: string) => {
  return typeof opName === 'string' && validChars.test(opName)
}

export const isValidTeamName = (teamName: string) =>
  typeof teamName === 'string' && validCharsTeamName.test(teamName)

export const isValidOpVersion = ({
  version,
}: OpCommand | OpWorkflow): boolean => {
  return typeof version === 'string' && validVersionChars.test(version)
}

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

export const isValidOpFullName = (opFullName: string): boolean => {
  return validOpsAddArg.test(opFullName)
}
