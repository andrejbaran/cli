import {
  OpCommand,
  OpWorkflow,
  Invite,
  Team,
  Config,
  User,
  Tokens,
  State,
  Membership,
} from '~/types'
import { COMMAND_TYPE, WORKFLOW_TYPE } from '~/constants/opConfig'

export const createMockOp = (inputs: Partial<OpCommand>): OpCommand => {
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
      port: '',
      configDir: '',
      stateDir: '',
      teamID: '',
      teamName: '',
      isPublic: false,
      help: {
        usage: '',
        arguments: {},
        options: {},
      },
      id: '',
      createdAt: '',
      updatedAt: '',
      type: COMMAND_TYPE,
      platformVersion: '',
      publishDescription: '',
    },
    inputs,
  )
}

export const createMockWorkflow = (inputs: Partial<OpWorkflow>): OpWorkflow => {
  return Object.assign(
    {
      name: '',
      description: '',
      steps: [''],
      env: [''],
      runId: '',
      opsHome: '',
      port: '',
      runtime: '',
      configDir: '',
      stateDir: '',
      teamID: '',
      teamName: '',
      isPublic: false,
      help: {
        usage: '',
        arguments: {},
        options: {},
      },
      id: '',
      createdAt: '',
      updatedAt: '',
      type: WORKFLOW_TYPE,
      version: 'latest',
      platformVersion: '',
      publishDescription: '',
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

export const createMockState = (inputs: Partial<State>): State => {
  return Object.assign(
    {
      config: createMockConfig({}),
    },
    inputs,
  )
}

export const createMockMembership = (
  inputs: Partial<Membership>,
): Membership => {
  return Object.assign(
    {
      userId: '',
      teamId: '',
      username: '',
      createdAt: '',
      firstName: '',
      lastName: '',
    },
    inputs,
  )
}
