import {
  COMMAND_TYPE,
  WORKFLOW_TYPE,
  GLUECODE_TYPE,
} from '../constants/opConfig'

export interface OpsYml {
  version: string
  ops: Op[]
  workflows: Workflow[]
}

export interface Op extends BaseFields {
  opsID: string
  type: COMMAND_TYPE | GLUECODE_TYPE
  // OPS.YML
  run: string
  sdk?: string
  bind: string[]
  network?: string
  src: string[]
  mountCwd: boolean
  mountHome: boolean
  port: string[]
  // RUN CMD
  image: string | void
}

export interface Workflow extends BaseFields {
  type: WORKFLOW_TYPE
  remote: boolean
  steps: string[]
}

interface BaseFields {
  name: string
  version: string
  platformVersion: string
  description: string
  publishDescription?: string
  env: string[]
  runId: string
  opsHome: string
  configDir: string
  stateDir: string
  teamID?: string
  teamName: string
  help: {
    usage: string
    arguments: { [key: string]: string }
    options: { [key: string]: string }
  }
  isPublic: boolean
  isPublished?: boolean
  // API
  id: string
  createdAt: string
  updatedAt: string
  local?: boolean
}
