/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Thursday, 25th April 2019 4:38:44 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Thursday, 25th April 2019 4:42:48 pm
 * @copyright (c) 2019 CTO.ai
 */

type Partial<T> = { [P in keyof T]?: T[P] }

export default Partial
