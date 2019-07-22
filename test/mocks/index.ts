import { Op, Workflow, Team } from '~/types'

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

export const createMockTeam = (inputs: Partial<Team>): Team => {
  return Object.assign(
    {
      name: '',
      id: '',
    },
    inputs,
  )
}
