export type IOpFile = 'ops.yml'
export type IWorkflow = 'workflow'
export type ICommand = 'command'
export type IGlueCode = 'glue_code'

export const OP_FILE: IOpFile = 'ops.yml'
export const WORKFLOW: IWorkflow = 'workflow'
export const COMMAND: ICommand = 'command'

export const PUBLIC = 'Public 🌎'
export const PRIVATE = 'Private 🔑'
export const LOCAL = 'Local 💻'

export type WORKFLOW_TYPE = 'workflow'
export type COMMAND_TYPE = 'command'
export type GLUECODE_TYPE = 'glue_code'
export const WORKFLOW_TYPE = 'workflow'
export const COMMAND_TYPE = 'command'
export const GLUECODE_TYPE = 'glue_code'

export type OpTypes = IWorkflow | ICommand | IGlueCode

export const COMMAND_ENDPOINT = 'ops'
export const WORKFLOW_ENDPOINT = 'workflows'

export const SDK2 = '2'
export const SDK2_DAEMON_ENTRYPOINT = '/bin/sdk-daemon'

export const getEndpointFromOpType = (opType: OpTypes) => {
  return opType === WORKFLOW ? WORKFLOW_ENDPOINT : COMMAND_ENDPOINT
}
