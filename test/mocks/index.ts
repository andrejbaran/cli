import { Op, Workflow, Invite, Team, Config, User, Tokens } from '~/types'

export const createMockOp = (inputs: Partial<Op>): Op => {
  return Object.assign(
    {
      src: [],
      mountCwd: false,
      mountHome: false,
      image: '',
      run: '',
      name: '',
      description: '',
      env: [''],
      runId: '',
      bind: [''],
      opsHome: '',
      configDir: '',
      stateDir: '',
      teamID: '',
      help: {
        usage: '',
        arguments: {},
        options: {},
      },
      id: '',
      createdAt: '',
      updatedAt: '',
    },
    inputs,
  )
}

export const createMockWorkflow = (inputs: Partial<Workflow>): Workflow => {
  return Object.assign(
    {
      name: '',
      description: '',
      steps: [''],
      env: [''],
      runId: '',
      opsHome: '',
      configDir: '',
      stateDir: '',
      teamID: '',
      help: {
        usage: '',
        arguments: {},
        options: {},
      },
      id: '',
      createdAt: '',
      updatedAt: '',
    },
    inputs,
  )
}

export const createMockConfig = (inputs: Partial<Config>): Config => {
  return {
    ...{
      team: createMockTeam({}),
      user: createMockUser({}),
      tokens: createMockTokens({}),
    },
    ...inputs,
  }
}

export const createMockTeam = (inputs: Partial<Team>): Team => {
  return Object.assign(
    {
      id: '',
      name: '',
    },
    inputs,
  )
}

export const createMockUser = (inputs: Partial<User>): User => {
  return Object.assign(
    {
      id: '',
      username: '',
      email: '',
    },
    inputs,
  )
}

export const createMockTokens = (inputs: Partial<Tokens>): Tokens => {
  return Object.assign(
    {
      accessToken: '',
      refreshToken: '',
      idToken: '',
      sessionState: '',
    },
    inputs,
  )
}

export const createMockInvite = (inputs: Partial<Invite>): Invite => {
  return Object.assign(
    {
      inviteCode: '',
      email: '',
      sentStatus: '',
    },
    inputs,
  )
}
