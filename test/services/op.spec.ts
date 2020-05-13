import { OpService, OpRunInputs } from '~/services/Op'
import { OpCommand, Config } from '~/types'
import { ContainerCreateOptions, Container } from 'dockerode'
import { RunCommandArgs } from '~/commands/run'
import { YamlPortError } from '~/errors/CustomErrors'

const baseOp: OpCommand = {
  name: '',
  description: '',
  env: [''],
  runId: '',
  opsHome: '',
  configDir: '',
  stateDir: '',
  help: {
    usage: '',
    arguments: { '': '' },
    options: { '': '' },
  },
  id: '',
  createdAt: '',
  updatedAt: '',
  run: '',
  bind: [''],
  src: [''],
  mountCwd: false,
  mountHome: false,
  port: [''],
  image: '',
}

let opRunInputs: OpRunInputs = {
  op: {} as OpCommand,
  config: {} as Config,
  parsedArgs: {} as RunCommandArgs,
  options: {} as ContainerCreateOptions,
  container: {} as Container,
}

describe('OpService', () => {
  beforeEach(() => {
    opRunInputs = { ...opRunInputs, op: { ...baseOp } }
  })

  describe('updateOpFields', () => {
    it('should append the parameters to the run command line', () => {
      const opService = new OpService()
      const result = opService.updateOpFields({
        ...opRunInputs,
        op: { ...opRunInputs.op, run: 'node index.js' },
        parsedArgs: { ...opRunInputs.parsedArgs, opParams: ['first', 'again'] },
      })

      expect(result.op).toHaveProperty('run', 'node index.js first again')
    })

    it('should assign a runId', () => {
      const opService = new OpService()
      const result = opService.updateOpFields({
        ...opRunInputs,
        op: { ...opRunInputs.op, run: 'node index.js' },
        parsedArgs: { ...opRunInputs.parsedArgs, opParams: ['first', 'again'] },
      })

      expect(result.op.runId).not.toBe('')
    })

    it('should prepend the daemon command to the run command line if sdk is 2', () => {
      const opService = new OpService()
      const result = opService.updateOpFields({
        ...opRunInputs,
        op: { ...opRunInputs.op, run: 'node index.js', sdk: '2' },
        parsedArgs: { ...opRunInputs.parsedArgs, opParams: ['first', 'again'] },
      })

      expect(result.op).toHaveProperty(
        'run',
        '/bin/sdk-daemon node index.js first again',
      )
    })
  })

  it('addPortsToOptions Should parse a single port in the correct format', async () => {
    const opService = new OpService()
    const port = ['3000:3000']
    const expectedExposedPorts = {
      '3000/tcp': {},
    }
    const expectedPortBindings = {
      '3000/tcp': [
        {
          HostPort: '3000',
        },
      ],
    }

    const result: OpRunInputs = await opService.addPortsToOptions({
      ...opRunInputs,
      op: { ...opRunInputs.op, port },
    })

    expect(result.options.ExposedPorts).toMatchObject(expectedExposedPorts)
    if (!result.options.HostConfig) throw new Error('Host Config is Undefined')
    expect(result.options.HostConfig.PortBindings).toMatchObject(
      expectedPortBindings,
    )
  })

  it('addPortsToOptions Should parse multiple ports in the correct format', async () => {
    const opService = new OpService()
    const port = ['3000:3000', '4000:5000', '6000:3000']
    const expectedExposedPorts = {
      '3000/tcp': {},
      '5000/tcp': {},
    }
    const expectedPortBindings = {
      '3000/tcp': [
        {
          HostPort: '3000',
        },
        {
          HostPort: '6000',
        },
      ],
      '5000/tcp': [
        {
          HostPort: '4000',
        },
      ],
    }
    const result: OpRunInputs = await opService.addPortsToOptions({
      ...opRunInputs,
      op: { ...opRunInputs.op, port },
    })

    expect(result.options.ExposedPorts).toMatchObject(expectedExposedPorts)
    if (!result.options.HostConfig) throw new Error('Host Config is Undefined')
    expect(result.options.HostConfig.PortBindings).toMatchObject(
      expectedPortBindings,
    )
  })

  it("addPortsToOptions Should throw an error if ports aren't formatted properly", async () => {
    const opService = new OpService()
    const port = ['invalidPort']
    await expect(
      opService.addPortsToOptions({
        ...opRunInputs,
        op: { ...opRunInputs.op, port },
      }),
    ).rejects.toBeInstanceOf(YamlPortError)
  })
})
