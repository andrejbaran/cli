export type IOpFile = 'ops.yml'
export type IWorkflow = 'workflow'
export type IOp = 'op'

export const OP_FILE: IOpFile = 'ops.yml'
export const WORKFLOW: IWorkflow = 'workflow'
export const OP: IOp = 'op'

export const PUBLIC = 'Public 🌎'
export const PRIVATE = 'Private 🔑'
export const LOCAL = 'Local 💻'

export type OpTypes = IWorkflow | IOp

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
      'Provide required environment variables for your op; to access, use the platform specific API, e.g. `process.env` for NodeJS',
    src:
      "Whitelist files and folders to be included in the published op's WORKDIR",
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
