/**
 * Author: Brett Campbell (brett@hackcapital.com)
 * Date: Friday, 5th April 2019 12:06:07 pm
 * Last Modified By: Brett Campbell (brett@hackcapital.com)
 * Last Modified Time: Friday, 5th April 2019 12:06:08 pm
 *
 * DESCRIPTION
 *
 */
import Op from '../types/op'

export default async function validate(op: Op) {
  if (typeof op.name !== 'string' || !op.name.match('^[a-z0-9_-]*$')) {
    console.log('Op Name must only contain numbers, letters, -, or _')
    process.exit()
  }
}
