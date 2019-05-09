/**
 * @author: Prachi Singh (prachi@hackcapital.com)
 * @date: Monday, 6th May 2019 1:37:34 pm
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Monday, 6th May 2019 2:06:20 pm
 *
 * DESCRIPTION: Error Source constants
 *
 * @copyright (c) 2019 Hack Capital
 */

export type IEXPECTED = 'EXPECTED'
export type IUNEXPECTED = 'UNEXPECTED'
const EXPECTED: IEXPECTED = 'EXPECTED'
const UNEXPECTED: IUNEXPECTED = 'UNEXPECTED'

export const errorSource = {
  EXPECTED,
  UNEXPECTED,
}
