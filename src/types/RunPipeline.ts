import Docker from 'dockerode'
import { Config, Op } from '.'

export type RunCommandArgs = {
  args: { nameOrPath: string }
  flags: {
    build?: boolean
    help?: boolean
  }
  opParams: string[]
}

export type RunPipeline = {
  config: Config
  isPublished: boolean
  op: Op
  options: Docker.ContainerCreateOptions
  parsedArgs: RunCommandArgs
}
