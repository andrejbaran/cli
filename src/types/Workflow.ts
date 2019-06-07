/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Wednesday, 15th May 2019 2:12:17 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Wednesday, 15th May 2019 2:39:32 pm
 * @copyright (c) 2019 CTO.ai
 */

export interface Workflow {
  opsHome: string
  stateDir: string
  name: string
  description: string
  run: string
  flags: string[]
  env: string[]
  help: {
    usage: string
    arguments: { [key: string]: string }
    options: { [key: string]: string }
  }
  before: string[]
  after: string[]
  teamID?: string
}
