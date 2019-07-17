import { Op, Workflow } from '~/types'

export const createMockOp = (opInputs: Partial<Op>): Op => {
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
    opInputs,
  )
}

export const createMockWorkflow = (opInputs: Partial<Workflow>): Workflow => {
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
    opInputs,
  )
}
