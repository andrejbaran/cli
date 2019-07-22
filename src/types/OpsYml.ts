export interface OpsYml {
  version: string
  ops: Op[]
  workflows: Workflow[]
}

export interface Op extends BaseFields {
  // OPS.YML
  run: string
  bind: string[]
  network?: string
  src: string[]
  mountCwd: boolean
  mountHome: boolean
  // RUN CMD
  image: string | void
}

export interface Workflow extends BaseFields {
  remote: boolean
  steps: string[]
  local?: boolean
}

interface BaseFields {
  name: string
  description: string
  env: string[]
  runId: string
  opsHome: string
  configDir: string
  stateDir: string
  teamID?: string
  help: {
    usage: string
    arguments: { [key: string]: string }
    options: { [key: string]: string }
  }
  isPublic?: boolean
  isPublished?: boolean
  // API
  id: string
  createdAt: string
  updatedAt: string
}
