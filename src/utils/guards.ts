/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Monday, 29th April 2019 5:55:21 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Thursday, 2nd May 2019 12:52:42 pm
 * @copyright (c) 2019 CTO.ai
 */

import { UndefinedParameter, MandatoryParameter } from '../errors'

export const handleUndefined = (undefinedParam: string) => {
  throw new UndefinedParameter(undefinedParam)
}

export const handleMandatory = (paramName?: string) => {
  throw new MandatoryParameter(paramName)
}
