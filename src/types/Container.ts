/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Wednesday, 24th April 2019 11:31:59 am
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Wednesday, 24th April 2019 11:33:12 am
 * @copyright (c) 2019 CTO.ai
 */

export default interface Container<T> {
  [key: string]: T
}
