/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Friday, 13th September 2019 5:20:14 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Friday, 13th September 2019 5:20:30 pm
 * @copyright (c) 2019 CTO.ai
 */

export const sleep = (milliseconds: number) => {
  return new Promise(resolve => setTimeout(() => resolve(), milliseconds))
}
