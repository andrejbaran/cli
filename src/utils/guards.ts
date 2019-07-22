/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Monday, 29th April 2019 5:55:21 pm
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Friday, 3rd May 2019 4:57:23 pm
 * @copyright (c) 2019 CTO.ai
 */

import { UndefinedParameter, MandatoryParameter } from '../errors/CustomErrors'

export const handleUndefined = (undefinedParam: string) => {
  throw new UndefinedParameter(undefinedParam)
}

export const handleMandatory = (paramName?: string) => {
  throw new MandatoryParameter(paramName)
}
