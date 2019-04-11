/**
 * Author: Brett Campbell (brett@hackcapital.com)
 * Date: Saturday, 6th April 2019 10:39:58 pm
 * Last Modified By: Brett Campbell (brett@hackcapital.com)
 * Last Modified Time: Saturday, 6th April 2019 10:40:00 pm
 *
 * DESCRIPTION
 *
 */
import * as path from 'path'

import Command, {flags} from '../base'

const _ = require('underscore')
const {ux} = require('@cto.ai/sdk')
const fs = require('fs-extra')
const through = require('through2')
const json = require('JSONStream')
const yaml = require('yaml')

const ops_api_host = process.env.OPS_API_HOST || 'https://cto.ai/'
const ops_api_path = process.env.OPS_API_PATH || 'api/v1'
const ops_registry_path = process.env.OPS_REGISTRY_PATH || 'registry.cto.ai'
const ops_registry_host = process.env.OPS_REGISTRY_HOST || `https://${ops_registry_path}`
const ops_registry_auth = {
  username: 'admin',
  password: 'UxvqKhAcRqrOgtscDUJC',
  serveraddress: ops_registry_host
}

export default class Run extends Command {
  static description = 'Run an op from the registry.'

  static flags = {
    help: flags.help({char: 'h'})
  }

  static args = [{name: 'name'}]

  previousKey
  isPublished
  CTRL_P = '\u0010'
  CTRL_Q = '\u0011'

  async run(this: any) {
    const self = this
    const {args} = this.parse(Run)
    self.isLoggedIn()
    let opNameOrPath = args.name
    if (!opNameOrPath) {
      const answer = await ux.prompt({
        type: 'input',
        name: 'name',
        message: 'What is the name or path of your op?',
        validate: input => {
          if (input === '') return 'Please enter the name or path of the op'
          return true
        }
      })
      opNameOrPath = answer.name
    }
    let op = await this._getOp(opNameOrPath)

    const list = await self.docker.listImages().catch(err => console.log(err))
    let found = false
    for (let k of list) {
      if (!k.RepoTags) {
        continue
      }
      if (k.RepoTags.join('').indexOf(`${op.image}:latest`) > -1) {
        found = true
        break
      }
    }
    if (!found) {
      await self._getImage(self, op, args.name)
    }
    self.log(`⚙️  Running ${ux.colors.dim(op.name)}...`)
    op = await self._setEnvs(self, op)
    op = await self._setBinds(op)
    const options = await this._getOptions(op)
    self.docker.createContainer(
      options,
      handler
    )

    function handler(err: any, container: any) {
      if (err) {
        self.log(`‼️  ${err.message}`)
        process.exit()
      }
      const attach_opts = {
        stream: true,
        stdin: true,
        stdout: true,
        stderr: true
      }
      ux.spinner.stop(ux.colors.green('Done!'))
      container.attach(attach_opts, function (_err: any, stream: any) {
        // Show outputs
        stream.pipe(process.stdout)
        // Connect stdin
        const stdin = process.stdin
        let isRaw = false
        stdin.resume()
        stdin.setEncoding('utf8')
        stdin.setRawMode(true)
        stdin.pipe(stream)
        stdin.on('data', function (this: any, key: any) {
          // Detects it is detaching a running container
          if (this.previousKey === this.CTRL_P && key === this.CTRL_Q)
            exit(container, stream, isRaw)
          this.previousKey = key
        })
        container.start(function (err: any, _data: any) {
          if (err) self.error(err.message, {exit: 2})
          resize(container)
          process.stdout.on('resize', function () {
            resize(container)
          })
          container.wait(function (_err: any, _data: any) {
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
              image: `${op.image}`
            }
          })
        })
      })
    }

    // Resize tty
    function resize(container: any) {
      const dimensions = {
        h: process.stdout.rows,
        w: process.stderr.columns
      }

      if (dimensions.h !== 0 && dimensions.w !== 0) {
        container.resize(dimensions, function () {})
      }
    }

    // Exit container
    function exit(container: any, stream: any, isRaw: any) {
      const stdout = process.stdout
      const stdin = process.stdin
      stdout.removeListener('resize', resize)
      stdin.removeAllListeners()
      stdin.setRawMode(isRaw)
      stdin.resume()
      stream.end()
      container.remove(() => {
        self.log()
        process.exit()
      })
    }
  }
  private async _getOp(opNameOrPath) {
    let op
    const opPath = path.join(path.resolve(process.cwd(), `${opNameOrPath}`), '/ops.yml')

    if (fs.existsSync(opPath)) {
      const manifest = await fs.readFile(opPath, 'utf8')
      op = yaml.parse(manifest)
      op.image = `${ops_registry_path}/${op.name}`
    } else {
      let splitOpName = opNameOrPath.split(':')
      let query: any = {
        query: {
          name: splitOpName[0],
          $sort: {
            created_at: -1
          }
        }
      }
      if (splitOpName[1]) {
        query.query.image = `${ops_registry_path}/${splitOpName[1].toLowerCase()}`
      }
      op = await this.client.service('ops').find(query)
      if (!op.total) {
        return this.log('‼️  No op was found with this name or ID. Please try again')
      }
      op = op.data[0]
      this.isPublished = true
    }
    op.run = op.run.split(' ')
    return op
  }

  private async _setEnvs(self, op) {
    const envs = _.map(op.env, e => {
      let x = e.split('=')
      return {key: x[0], value: x[1]}
    })
    const penvs = _.mapObject(process.env, (v, k) => {
      return {key: k, value: v}
    })
    op.env = _.map(envs, e => {
      if (e && penvs[e.key] && penvs[e.key].value) {
        return `${penvs[e.key].key}=${penvs[e.key].value}`
      } else {
        return `${e.key}=${e.value}`
      }
    })
    op.env.push(`OPS_API_HOST=${ops_api_host}`)
    op.env.push(`OPS_API_PATH=${ops_api_path}`)
    op.env.push(`OPS_ACCESS_TOKEN=${self.accessToken}`)
    op.env.push('LOGGER_PLUGINS_STDOUT_ENABLED=true')
    op.env.push('NODE_ENV=production')
    return op
  }

  private async _setBinds(op) {
    const binds = _.map(op.bind, b => {
      let x = b.split(':')
      x[0] = x[0].replace('~', process.env.HOME).replace('$HOME', process.env.HOME)
      return {key: x[0], value: x[1]}
    })
    op.bind = _.map(binds, b => {
      return `${b.key}:${b.value}`
    })
    return op
  }

  private async _getImage(self, op, opPath) {
    if (self.isPublished) {
      await self._getImageFromRegistry(self, op)
    } else {
      opPath = path.resolve(process.cwd(), `${opPath}`)
      await self.config.runHook('build', {
        tag: `${op.image}:latest`,
        opPath,
        op
      })
    }
  }

  private async _getImageFromRegistry(self, op) {
    this.log(`🔋 Pulling ${ux.colors.dim(op.name)} from registry...\n`)
    let all = []
    let size = 100
    const {parser, bar} = await this._setParser(op)
    const stream = await self.docker.pull(`${ops_registry_path}/${op.name}`, {authconfig: ops_registry_auth})
    await new Promise((resolve, reject) => {
      stream
        .pipe(json.parse())
        .pipe(parser)
        .on('data', d => {
          all.push(d)
        })
        .on('end', async function (err) {
          for (let i = 0; i < size; i++) {
            bar.update(100 - (size / i))
            await ux.wait(5)
          }
          bar.update(100)
          bar.stop()
          return err ? reject(err) : resolve(all)
        })
    })
    ux.spinner.stop(ux.colors.green('Done!'))
    let msg = ux.colors.italic.bold(`${op.name}:${op._id}`)
    this.log(`\n🙌 Saved ${msg} locally! \n`)
  }

  private async _setParser(op) {
    const bar = ux.progress.init({
      format: ux.colors.callOutCyan('{bar} {percentage}% | Status: {speed} '),
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591'
    })
    let layers = {}
    bar.start(100, 0, {speed: '🏁 Starting...'})

    let parser = through.obj(function (chunk, _enc, cb) {
      if (chunk.id) {
        layers[chunk.id] = chunk.id
      }
      if (chunk.status === `Pulling from ${op.name}`) {
        bar.update(0, {
          speed: `✅ Pulling from ${op.name}...`
        })

      } else if (chunk.status === 'Already exists') {
        bar.update(0, {
          speed: '✅ Already exists!'
        })
      } else if (chunk.status === 'Waiting') {
        bar.update(0, {
          speed: '⏱  Waiting...'
        })
      } else if (chunk.status === 'Downloading') {
        bar.update((chunk.progressDetail.current / chunk.progressDetail.total * 100), {
          speed: '👇 Downloading...'
        })
      } else if (chunk.status === 'Download complete') {
        bar.update((chunk.progressDetail.current / chunk.progressDetail.total * 100), {
          speed: '👇 Downloaded!'
        })
      } else if (chunk.status === 'Extracting') {
        bar.update((chunk.progressDetail.current / chunk.progressDetail.total * 100), {
          speed: '📦 Unpacking...'
        })
      } else if (chunk.status === 'Pulling fs layer') {
        bar.update(0, {
          speed: '🐑 Pulling layers...'
        })
      } else if (chunk.status === 'Pull complete') {
        bar.update(0, {
          speed: '🎉 Pull Complete!'
        })

      } else if (chunk.progressDetail && chunk.progressDetail.current) {
        bar.update((chunk.progressDetail.current / chunk.progressDetail.total * 100), {
          speed: '👇 Downloading...'
        })

      }
      cb()
    })

    parser._pipe = parser.pipe
    parser.pipe = function (dest) {
      return parser._pipe(dest)
    }
    return {parser, bar}
  }

  private async _getOptions(op) {
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
      Image: `${ops_registry_path}/${op.name}:latest`,
      Volumes: {},
      VolumesFrom: [],
      WorkingDir: '',
      HostConfig: {
        Binds: op.bind,
        NetworkMode: op.network
      }
    }
    if (op.workdir) {
      options.WorkingDir = process.cwd().replace(process.env.HOME, op.workdir)
    }
    return options
  }
}
