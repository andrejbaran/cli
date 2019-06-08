/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Friday, 24th May 2019 1:41:52 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Friday, 7th June 2019 2:16:40 pm
 * @copyright (c) 2019 CTO.ai
 */

// we need this because DEBUG is an env, hence a string by default
export const isTruthy = (val: string | undefined) => val != 'false'
