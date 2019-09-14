/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Monday, 29th April 2019 5:55:21 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Friday, 13th September 2019 1:13:02 pm
 * @copyright (c) 2019 CTO.ai
 */

export const titleCase = (str: string) => {
  return str
    .split(' ')
    .map(w => w[0].toUpperCase() + w.substr(1).toLowerCase())
    .join(' ')
}

export const pluralize = (str: string) => {
  return `${str}s`
}

export const appendSuffix = (name: string, suffix: string) => `${name}${suffix}`
