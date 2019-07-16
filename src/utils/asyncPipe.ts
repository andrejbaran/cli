/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Tuesday, 23rd April 2019 11:05:01 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Wednesday, 24th April 2019 12:45:12 pm
 * @copyright (c) 2019 CTO.ai
 */

// based on https://github.com/obengwilliam/pipeawait

const asyncPipe = (...fns: Function[]) => (param?: any) =>
  fns.reduce(async (acc, fn) => fn(await acc), param)

const _trace = (msg: string) => (x: any) => {
  console.log(msg, x)
  return x
}

export { asyncPipe, _trace }
