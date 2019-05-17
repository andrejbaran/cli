/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Friday, 10th May 2019 12:10:47 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Thursday, 16th May 2019 1:36:20 pm
 * @copyright (c) 2019 CTO.ai
 */

import { ChildProcess } from 'child_process'
import { ChildProcessError } from '~/types'

// import { promisify } from 'util'

/*
 * this is based on @rauschma/stringio's onExit utility:
 * http://2ality.com/2018/05/child-process-streams.html.
 * In our case, we don't want the promise to reject in case of error, because
 * this will exit the whole process. We want to continue execution in spite of
 * errors. *
 */
export function onExit(
  childProcess: ChildProcess,
): Promise<void | ChildProcessError> {
  return new Promise((resolve, reject) => {
    childProcess.once('exit', (code: number, signal: string) => {
      if (code === 0) {
        resolve(undefined)
      } else {
        resolve({ code, signal })
      }
    })
    childProcess.once('error', (err: Error) => {
      reject(err)
    })
  })
}

// alternative is to promisify child process
// const promisifiedSpawn: (
//   command: string,
//   params: string[],
//   options: SpawnOptions,
// ) => Promise<ChildProcess> = promisify(spawn)
