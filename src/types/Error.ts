/**
 * @author: Prachi Singh (prachi@hackcapital.com)
 * @date: Wednesday, 24th April 2019 9:50:37 am
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Tuesday, 30th April 2019 2:57:57 pm
 *
 * DESCRIPTION: Error type
 *
 * @copyright (c) 2019 Hack Capital
 */

/*
 * Currently, we have just two categories of errors
 * 1. UNEXPECTED
 *     Error in the source code, programmer has done something wrong
 *     Should be eliminated by proper testing before production
 * 2. EXPECTED
 *     When the input provided by the user is not valid.
 *     This is an expected error and we want the user to take the provided action in the message to eliminate the error
 */
enum ErrorSource {
  unexpected = 'UNEXPECTED',
  expected = 'EXPECTED',
}

/**
 * message and stack are stringified objects which can contain (Refer to @hackcapital/errors)
 * message: {
 *  extra?: object,
 *  errorCode?: string,
 *  statusCode?: string,
 *  note: string
 * }
 */
export interface Error {
  name: string
  message: string
  stack: string
  errorCode: string
  statusCode: string
  source: ErrorSource
  exit: boolean
}
