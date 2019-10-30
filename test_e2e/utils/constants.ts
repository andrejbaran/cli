export const DOWN = '\x1B\x5B\x42'
export const UP = '\x1B\x5B\x41'
export const ENTER = '\x0D'
export const SPACE = '\x20'
export const ESCAPE = '\x1B'
export const Y = '\x79'

export const NEW_COMMAND_NAME = 't_command_e2e_test'
export const NEW_COMMAND_DESCRIPTION = 't_command_e2e_test description'

export const PUBLIC_TEAM_NAME = 'cto.ai'
export const PUBLIC_COMMAND_NAME = 'github'
// any valid github personal access token will work here
export const GITHUB_ACCESS_TOKEN = 'f3d14e5dc6217923101938c52f25a98bf5898d69'

export const NEW_OP_NAME = 't_op_e2e_test'
export const NEW_OP_DESCRIPTION = 't_op_e2e_test description'

export const NEW_WORKFLOW_NAME = 't_workflow_e2e_test'
export const NEW_WORKFLOW_DESCRIPTION = 't_workflow_e2e_test description'

export const EXISTING_OP_NAME = 'write_a_file_op'
export const EXISTING_WORKFLOW_NAME = 'echo_message_workflow'

export const EXISTING_USER_NAME = 'existing_user'
export const EXISTING_USER_EMAIL = 'e2e_existing_user1@cto.ai'
export const EXISTING_USER_PASSWORD = 'password'

export const EXISTING_USER_ID = 'd233c6f3-96f1-4bf9-918f-b774204dab20' // STAGING
export const EXISTING_TEAM_ID = 'fe7a5964-b104-46aa-b353-751ec03e8744' // STAGING

export const NEW_USER_EMAIL = 't_email_new_user@cto.ai'
export const NEW_USER_NAME = 't_user_new'
export const NEW_USER_PASSWORD = 'password'
export const NEW_FILE = 'BRANDNEWFILE.txt'

export const getValidTeamName = () =>
  't_team_' + Math.ceil(Math.random() * 100000)
export const INVALID_TEAM_NAME = 't_team_;$/'
