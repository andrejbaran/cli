import Docker from 'dockerode'
import { Config, OpCommand } from '.'

export type RunCommandArgs = {
  args: { nameOrPath: string }
  flags: {
    build?: boolean
    batch?: boolean
    help?: boolean
  }
  opParams: string[]
}

export type RunPipeline = {
  config: Config
  isPublished: boolean
  op: OpCommand
  options: Docker.ContainerCreateOptions
  parsedArgs: RunCommandArgs
}
