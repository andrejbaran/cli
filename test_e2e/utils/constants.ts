export const DOWN = '\x1B\x5B\x42'
export const UP = '\x1B\x5B\x41'
export const ENTER = '\x0D'
export const SPACE = '\x20'
export const NEW_OP_NAME = 't_my_new_op'
export const NEW_OP_DESCRIPTION = 'my new op description'
export const EXISTING_OP_NAME = 'write_a_file_op'
export const EXISTING_USER_EMAIL = 'e2e_existing_user1@cto.ai'
export const EXISTING_USER_PASSWORD = 'password'
export const NEW_USER_EMAIL = 't_email_new_user@cto.ai'
export const NEW_USER_NAME = 't_user_new'
export const NEW_USER_PASSWORD = 'password'
export const NEW_FILE = 'BRANDNEWFILE.txt'
export const getValidTeamName = () =>
  't_team_' + Math.ceil(Math.random() * 100000)
export const INVALID_TEAM_NAME = 't_team_;$/'