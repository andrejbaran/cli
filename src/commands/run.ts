/**
 * @author: Brett Campbell (brett@hackcapital.com)
 * @date: Saturday, 6th April 2019 10:39:58 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Friday, 3rd May 2019 12:50:47 pm
 * @copyright (c) 2019 CTO.ai
 *
 * DESCRIPTION
 *
 */

import { ux } from '@cto.ai/sdk'
import * as fs from 'fs-extra'
import * as json from 'JSONStream'
import * as path from 'path'
import * as through from 'through2'
import _ from 'underscore'
import * as yaml from 'yaml'
import Command, { flags } from '../base'
import {
  HOME,
  OPS_API_HOST,
  OPS_API_PATH,
  OPS_REGISTRY_HOST,
} from '../constants/env'
import { Op, RegistryAuth } from '../types'
import { getOpImageTag, getOpUrl } from '../utils/getOpUrl'
import { CouldNotGetRegistryToken } from '../errors'

export default class Run extends Command {
  static description = 'Run an op from the registry.'

  static flags = {
    help: flags.help({ char: 'h' }),
    build: flags.boolean({
      char: 'b',
      description:
        'Builds the op before running. Must provide a path to the op.',
    }),
  }

  // Used to specify variable length arguments
  static strict = false

  static args = [
    {
      name: 'nameOrPath',
      description: 'Name or path of the op you want to run.',
    },
  ] // Specifies the arguments so that we can destructure it

  previousKey = ''

  isPublished = false
  CTRL_P = '\u0010'
  CTRL_Q = '\u0011'

  async run() {
    const self = this
    this.isLoggedIn()

    // Obtain the op if exists, otherwise return
    const { args, argv, flags } = this.parse(Run)
    if (!args.nameOrPath) {
      throw new Error('Please enter the name or path of the op')
    }

    // Get the local image if exists
    const opParams: string[] = argv.slice(Object.keys(args).length)

    let op = await this._getOp(args.nameOrPath, opParams)

    if (!this.docker) {
      throw new Error('no docker')
    }

    const list = await this.docker.listImages().catch(err => console.log(err))

    const found = await this._findLocalImage(list, op)

    // If local image doesn't exist, try to pull from registry
    if (!found || flags.build) {
      await this._getImage(op, args.nameOrPath)
    }

    self.log(`⚙️  Running ${ux.colors.dim(op.name)}...`)
    try {
      op = await this._setEnvs(this, op)
      op = await this._setBinds(op)
      const options = await this._getOptions(op)

      this.docker.createContainer(options, handler)
    } catch (error) {
      console.error(error)
    }

    function handler(err: any, container: any) {
      if (err) {
        self.log(`‼️  ${err.message}`)
        process.exit()
      }
      const attach_opts = {
        stream: true,
        stdin: true,
        stdout: true,
        stderr: true,
      }
      ux.spinner.stop(ux.colors.green('Done!'))

      container.attach(attach_opts, function(_err: any, stream: any) {
        // Show outputs
        stream.pipe(process.stdout)
        // Connect stdin
        const stdin = process.stdin
        let isRaw = false
        stdin.resume()
        stdin.setEncoding('utf8')
        stdin.setRawMode && stdin.setRawMode(true)
        stdin.pipe(stream)
        stdin.on('data', function(this: any, key: any) {
          // Detects it is detaching a running container
          if (this.previousKey === this.CTRL_P && key === this.CTRL_Q)
            exit(container, stream, isRaw)
          this.previousKey = key
        })
        container.start(function(err: any, _data: any) {
          if (err) self.error(err.message, { exit: 2 })
          resize(container)
          process.stdout.on('resize', function() {
            resize(container)
          })
          container.wait(function(_err: any, _data: any) {
            exit(container, stream, isRaw)
          })
          self.analytics.track({
            userId: self.user.email,
            event: 'Ops CLI Run',
            properties: {
              email: self.user.email,
              username: self.user.username,
              name: op.name,
              description: op.description,
              image: `${op.image}`,
            },
          })
        })
      })
    }

    // Resize tty
    function resize(container: any) {
      const dimensions = {
        h: process.stdout.rows,
        w: process.stderr.columns,
      }

      if (dimensions.h !== 0 && dimensions.w !== 0) {
        container.resize(dimensions, function() {})
      }
    }

    // Exit container
    function exit(container: any, stream: any, isRaw: any) {
      const stdout = process.stdout
      const stdin = process.stdin
      stdout.removeListener('resize', resize)
      stdin.removeAllListeners()
      stdin.setRawMode && stdin.setRawMode(isRaw)
      stdin.resume()
      stream.end()
      container.remove(() => {
        self.log()
        process.exit()
      })
    }
  }

  /**
   * Gets the local image if exists
   * @param list The list of images
   * @param op The desired op we want to run
   * @returns Whether the image exists or not
   */
  private async _findLocalImage(list, op: Op): Promise<boolean> {
    for (let k of list) {
      if (!k.RepoTags || !k.RepoTags.length) {
        continue
      }
      const opIdentifier = this.isPublished ? op.id : op.name
      if (
        k.RepoTags.find((n: string) =>
          n.includes(
            `${OPS_REGISTRY_HOST}/${this.team.name}/${opIdentifier}:latest`,
          ),
        )
      ) {
        return true
      }
    }
    return false
  }

  private async _getOp(opNameOrPath: string, opParams: string[]) {
    let op
    const opPath = path.join(
      path.resolve(process.cwd(), `${opNameOrPath}`),
      '/ops.yml',
    )

    if (fs.existsSync(opPath)) {
      const manifest = await fs.readFile(opPath, 'utf8')
      op = yaml.parse(manifest)
      op.image = `${OPS_REGISTRY_HOST}/${this.team.name}/${op.name}`
    } else {
      let splitOpName = opNameOrPath.split(':')

      try {
        const res = await this.api.find('ops', {
          query: {
            team_id: this.team.id,
            search: splitOpName[0],
          },
          headers: { Authorization: this.accessToken },
        })
        if (!res.data) {
          return this.log(
            '‼️  No op was found with this name or ID. Please try again',
          )
        }
        op = res.data[0]
      } catch (error) {
        throw new Error(error)
      }

      this.isPublished = true
    }
    op.run = op.run.split(' ')
    op.run = [...op.run, ...opParams]
    return op
  }

  private async _setEnvs(self, op) {
    const envs = _.map(op.env, (e: string) => {
      const x = e.split('=')
      return { key: x[0], value: x[1] }
    })
    const penvs = _.mapObject(process.env, (v, k) => {
      return { key: k, value: v }
    })
    op.env = _.map(envs, e => {
      if (e && penvs[e.key] && penvs[e.key].value) {
        return `${penvs[e.key].key}=${penvs[e.key].value}`
      } else {
        return `${e.key}=${e.value}`
      }
    })
    op.env.push(`OPS_API_HOST=${OPS_API_HOST}`)
    op.env.push(`OPS_API_PATH=${OPS_API_PATH}`)
    op.env.push(`OPS_ACCESS_TOKEN=${self.accessToken}`)
    op.env.push('LOGGER_PLUGINS_STDOUT_ENABLED=true')
    op.env.push('NODE_ENV=production')
    return op
  }

  private async _setBinds(op) {
    const binds = _.map(op.bind, (b: string) => {
      const x = b.split(':')
      x[0] = x[0].replace('~', HOME).replace('$HOME', HOME)
      return { key: x[0], value: x[1] }
    })
    op.bind = _.map(binds, b => {
      return `${b.key}:${b.value}`
    })
    return op
  }

  /**
   * Gets the image from the registry if it is published, otherwise from your local
   * @param self The original 'this'
   * @param op The desired op information that we want to run
   * @param opPath The location of the op in the user's machine
   */
  private async _getImage(op: any, opPath: string) {
    if (this.isPublished) {
      await this._getImageFromRegistry(op)
    } else {
      opPath = path.resolve(process.cwd(), `${opPath}`)
      await this.config.runHook('build', {
        tag: `${op.image}:latest`,
        opPath,
        op,
      })
    }
  }

  private async _getImageFromRegistry(op) {
    this.log(`🔋 Pulling ${ux.colors.dim(op.name)} from registry...\n`)
    let all: any[] = []
    let size = 100
    const { parser, bar } = await this._setParser(op)

    const registryAuth: RegistryAuth | undefined = await this.getRegistryAuth(
      this.accessToken,
    )

    if (!registryAuth || !registryAuth.authconfig) {
      throw new CouldNotGetRegistryToken(this.state)
    }

    const opIdentifier = this.isPublished ? op.id : op.name
    const opImageTag = getOpImageTag(this.team.name, opIdentifier)

    const opUrl = getOpUrl(OPS_REGISTRY_HOST, opImageTag)

    if (!this.docker) {
      throw new Error('no docker')
    }
    const stream = await this.docker
      .pull(opUrl, {
        authconfig: registryAuth.authconfig,
      })
      .catch(err => {
        console.log({ err })
      })

    if (!stream) {
      throw new Error('no stream')
    }

    await new Promise((resolve, reject) => {
      stream
        .pipe(json.parse())
        .pipe(parser)
        .on('data', (d: any) => {
          all.push(d)
        })
        .on('end', async function(err) {
          for (let i = 0; i < size; i++) {
            bar.update(100 - size / i)
            await ux.wait(5)
          }
          bar.update(100)
          bar.stop()
          return err ? reject(err) : resolve(all)
        })
    })
    ux.spinner.stop(ux.colors.green('Done!'))
    let msg = ux.colors.italic.bold(`${op.name}:${op.id}`)
    this.log(`\n🙌 Saved ${msg} locally! \n`)
  }

  private async _setParser(op) {
    const bar = ux.progress.init({
      format: ux.colors.callOutCyan('{bar} {percentage}% | Status: {speed} '),
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
    })
    let layers = {}
    bar.start(100, 0, { speed: '🏁 Starting...' })

    let parser = through.obj(function(chunk, _enc, cb) {
      if (chunk.id) {
        layers[chunk.id] = chunk.id
      }
      if (chunk.status === `Pulling from ${op.name}`) {
        bar.update(0, {
          speed: `✅ Pulling from ${op.name}...`,
        })
      } else if (chunk.status === 'Already exists') {
        bar.update(0, {
          speed: '✅ Already exists!',
        })
      } else if (chunk.status === 'Waiting') {
        bar.update(0, {
          speed: '⏱  Waiting...',
        })
      } else if (chunk.status === 'Downloading') {
        bar.update(
          (chunk.progressDetail.current / chunk.progressDetail.total) * 100,
          {
            speed: '👇 Downloading...',
          },
        )
      } else if (chunk.status === 'Download complete') {
        bar.update(
          (chunk.progressDetail.current / chunk.progressDetail.total) * 100,
          {
            speed: '👇 Downloaded!',
          },
        )
      } else if (chunk.status === 'Extracting') {
        bar.update(
          (chunk.progressDetail.current / chunk.progressDetail.total) * 100,
          {
            speed: '📦 Unpacking...',
          },
        )
      } else if (chunk.status === 'Pulling fs layer') {
        bar.update(0, {
          speed: '🐑 Pulling layers...',
        })
      } else if (chunk.status === 'Pull complete') {
        bar.update(0, {
          speed: '🎉 Pull Complete!',
        })
      } else if (chunk.progressDetail && chunk.progressDetail.current) {
        bar.update(
          (chunk.progressDetail.current / chunk.progressDetail.total) * 100,
          {
            speed: '👇 Downloading...',
          },
        )
      }
      cb()
    })

    const _pipe = parser.pipe
    parser.pipe = function(dest) {
      return _pipe(dest)
    }
    return { parser, bar }
  }

  private async _getOptions(op) {
    const opIdentifier = this.isPublished ? op.id : op.name
    let options = {
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
      OpenStdin: true,
      StdinOnce: false,
      Env: op.env,
      Cmd: op.run,
      // WorkingDir: process.cwd().replace(process.env.HOME, '/root'),
      Image: getOpUrl(
        OPS_REGISTRY_HOST,
        getOpImageTag(this.team.name, opIdentifier),
      ),
      Volumes: {},
      VolumesFrom: [],
      WorkingDir: '',
      HostConfig: {
        Binds: op.bind,
        NetworkMode: op.network,
      },
    }
    if (op.workdir) {
      options.WorkingDir = process.cwd().replace(HOME, op.workdir)
    }
    return options
  }
}
