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

export const YAML_TYPE_STRING = 'QUOTE_SINGLE'
export const YAML_TYPE_SEQUENCE = 'SEQ'

export const HELP_COMMENTS = {
  version: 'Defines the used `ops.yml` schema version',
  ops: {
    name: `Unique identifier for your op (required)`,
    description: 'Short description for what your op does (required)',
    run:
      'Command that is executed when op is started ("npm start", "./start_script.sh", etc.) (required)',
    env:
      'Provide required environment variables for your op; to access, use the platform specific API, e.g. `process.env` for NodeJS\n To use environment variables from the Host, use the $ prefix:',
    src:
      "Whitelist files and folders to be included in the published op's WORKDIR",
    public:
      'Determines whether this version of the op is visible to other people',
    mountCwd:
      "If set to `true`, binds the host's current working directory to `/cwd`; default value: `false` - working directory `/ops`",
    mountHome:
      "If set to `true`, binds the host's home directory to `/root`; default value: `false`",
    bind:
      'Bind additional volumes; trail the string accordingly to configure permissions for either read-only (:ro) or write (:w) access (example: ~/tmp:/root/tmp will bind lefthand directory in host to righthand directory in ops)',
    port: 'Map ports for your op container',
    help:
      'Configure the output for when your op is run with `op --help` or `op -h`',
  },
  workflows: {
    name: `Unique identifier for your workflow (required)`,
  },
}
