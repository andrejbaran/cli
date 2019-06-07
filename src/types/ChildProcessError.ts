/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Wednesday, 8th May 2019 7:32:02 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Thursday, 16th May 2019 2:53:05 pm
 * @copyright (c) 2019 CTO.ai
 */

import { CommandInfo } from '~/commands/run'

export interface ChildProcessError {
  code: number
  signal: string
}

export interface WorkflowPipelineError {
  exitResponse: ChildProcessError | void
  commandInfo: CommandInfo
}
