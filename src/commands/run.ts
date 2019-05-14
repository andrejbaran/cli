/**
 * @author: Brett Campbell (brett@hackcapital.com)
 * @date: Saturday, 6th April 2019 10:39:58 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Monday, 13th May 2019 3:05:46 pm
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
import { Op, RegistryAuth, Container, Config } from '../types'
import { getOpImageTag, getOpUrl } from '../utils/getOpUrl'
import { CouldNotGetRegistryToken } from '../errors/customErrors'
import { Question } from 'inquirer'

export default class Run extends Command {
  static description = 'Run an op from the registry.'

  static flags = {
    help: flags.boolean({
      char: 'h',
      description: 'show CLI help',
    }),
    build: flags.boolean({
      char: 'b',
      description:
        'Builds the op before running. Must provide a path to the op.',
      default: false,
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

  prompts: Container<Question> = {
    agreeToMountHome: {
      type: 'confirm',
      name: 'agreeToMountHome',
      message:
        'Note: This container will mount your home directory as a read-only file system. Continue?',
    },
    ignoreMountWarnings: {
      type: 'confirm',
      name: 'ignoreMountWarnings',
      message: 'Would you like to skip this confirmation step from now on?',
    },
  }

  parse(options, argv = this.argv) {
    if (!options) options = this.constructor
    var value = require('@oclif/parser').parse(argv, {
      context: this,
      ...options,
    })
    argv.shift()
    value.opParams = argv
    return value
  }

  async run() {
    const self = this
    this.isLoggedIn()

    // Obtain the op if exists, otherwise return
    const { args, argv, flags } = this.parse(Run)
    if (!args.nameOrPath) {
      // If run is not supplied any arguments, and the help flag is given,
      // Use the default help functionality
      if (flags.help) {
        this._help()
      }
      throw new Error('Please enter the name or path of the op')
    }

    // Get the local image if exists
    const opParams: string[] = this._getAllArgsAfterOpName(argv, args)

    let op = await this._getOp(args.nameOrPath, opParams)

    if (flags.help) {
      this._printCustomHelp(op)
      return
    }

    if (!this.docker) {
      throw new Error('no docker')
    }

    const list = await this.docker.listImages().catch(err => console.log(err))

    const found = await this._findLocalImage(list, op)

    // If local image doesn't exist, try to pull from registry
    if (!found || flags.build) {
      await this._getImage(op, args.nameOrPath)
    }

    await this._doBindMountChecks(op.mountHome, this.state.config)

    self.log(`⚙️  Running ${ux.colors.dim(op.name)}...`)
    try {
      op.env = this._setEnvs(process.env)(op.env, this.accessToken)
      op.bind = this._setBinds(op.bind)

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

  private _getAllArgsAfterOpName(argv: any, args: any): string[] {
    return argv.slice(Object.keys(args).length)
  }

  /**
   * Prints the custom help function as defined in the ops.yml
   * @param op The found op to destructure the help function
   */
  private _printCustomHelp(op: Op): void {
    // Handles edge case if there is no op
    if (!op) {
      this.log("Sorry, we couldn't find the op you're looking for")
      return
    }

    if (op.description) this.log(`${op.description}\n`)

    // Handles the edge case if there is an ops.yml, but no help section is defined
    if (!op.help) {
      this.log('Custom help message can be defined in the ops.yml\n')
      return
    }

    // Prints the help usage of the op if exists
    if (op.help.usage) {
      this.log(`${ux.colors.bold('USAGE')}`)
      this.log(`  ${op.help.usage}\n`)
    }
    // Loops through the help arguments if exists and display them one by one
    // e.g.
    // ARGUMENTS
    //   argument1 Test argument 1
    //   argument2 Test argument 2
    //   argument3 Test argument 3
    if (op.help.arguments) {
      this.log(`${ux.colors.bold('ARGUMENTS')}`)
      Object.keys(op.help.arguments).forEach(a => {
        this.log(`  ${a} ${ux.colors.dim(op.help.arguments[a])}`)
      })
    }
    // Loops through the help options if exists and display them one by one
    // e.g.
    // OPTIONS
    //   -b, --build Testing the build
    //   -c, --clear Testing the clear
    //   -d, --delete Testing the delete
    if (op.help.options) {
      this.log(`${ux.colors.bold('OPTIONS')}`)
      Object.keys(op.help.options).forEach(o => {
        this.log(
          `  -${o.substring(0, 1)}, --${o} ${ux.colors.dim(
            op.help.options[o],
          )}`,
        )
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
          headers: {
            Authorization: this.accessToken,
          },
        })

        if (!res || !res.data) {
          throw `API request failed ${res.message}`
        }
        if (!res.data.length) {
          this.log('‼️  No op was found with this name or ID. Please try again')
          process.exit()
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

  _setEnvs = (processEnv: Container<string | undefined>) => (
    env: string[],
    accessToken: string,
  ) => {
    const defaultEnv: Container<string> = {
      NODE_ENV: 'production',
      LOGGER_PLUGINS_STDOUT_ENABLED: 'true',
      OPS_ACCESS_TOKEN: accessToken,
      OPS_API_PATH,
      OPS_API_HOST,
    }
    const opsYamlEnv: Container<string> | null = env
      ? env.reduce(this._convertEnvStringsToObject, {})
      : []

    const mergedEnv = {
      ...defaultEnv,
      ...opsYamlEnv,
    }

    const overriddenEnv = Object.entries(mergedEnv)
      .map(this._overrideEnvWithProcessEnv(processEnv))
      .map(this._concatenateKeyValToString)

    return overriddenEnv
  }

  _concatenateKeyValToString = ([key, val]: [string, string]) => `${key}=${val}`

  _setBinds = (binds: string[]) => {
    return binds ? binds.map(this._replaceHomeAlias) : []
  }

  _convertEnvStringsToObject = (acc: Container<string>, curr: string) => {
    const [key, val] = curr.split('=')
    if (!val) {
      return { ...acc }
    }
    return {
      ...acc,
      [key]: val,
    }
  }

  _overrideEnvWithProcessEnv = (processEnv: Container<string | undefined>) => ([
    key,
    val,
  ]: [string, string]) => [key, processEnv[key] || val]

  private _replaceHomeAlias = (bindPair: string) => {
    const pairArray = bindPair.split(':')
    let [first, ...rest] = pairArray

    const from = first.replace('~', HOME).replace('$HOME', HOME)
    const to = rest.join('')

    return `${from}:${to}`
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
      throw new CouldNotGetRegistryToken()
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

    if (op.mountCwd) {
      const bindFrom = process.cwd()
      const bindTo = '/cwd'
      const cwDir = `${bindFrom}:${bindTo}`
      op.bind.push(cwDir)
    }

    if (op.mountHome) {
      const homeDir = `${HOME}:/root:ro`
      op.bind.push(homeDir)
    }

    let options = {
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
      OpenStdin: true,
      StdinOnce: false,
      Env: op.env,
      Cmd: op.run,

      WorkingDir: op.mountCwd ? '/cwd' : '/ops',
      Image: getOpUrl(
        OPS_REGISTRY_HOST,
        getOpImageTag(this.team.name, opIdentifier),
      ),
      HostConfig: {
        Binds: op.bind,
        NetworkMode: op.network,
      },
    }
    return options
  }

  _promptForHomeDirectory = async (
    mountHome: boolean,
    { ignoreMountWarnings }: Config,
  ) => {
    if (mountHome && !ignoreMountWarnings) {
      return this.ux.prompt(this.prompts.agreeToMountHome)
    }
    return { agreeToMountHome: ignoreMountWarnings }
  }

  _promptToIgnoreWarning = async (
    mountHome: boolean,
    { ignoreMountWarnings }: Config,
  ) => {
    /*
     * Prompt user only if ignore flag is undefined. If it is set to true or false,
     * the user has made up their mind. They should be asked this question only
     * once, not every time they run. *
     */
    if (mountHome && typeof ignoreMountWarnings === 'undefined') {
      return this.ux.prompt(this.prompts.ignoreMountWarnings)
    }
    return { ignoreMountWarnings }
  }

  _doBindMountChecks = async (mountHome: boolean, config: Config) => {
    if (!mountHome || config.ignoreMountWarnings) {
      return
    }
    const { agreeToMountHome } = await this._promptForHomeDirectory(
      mountHome,
      config,
    )

    // TO-DO: replace with link to actual docs
    if (!agreeToMountHome) {
      this.log(
        "\nAborting op execution. If you'd like to read more about our bind-mounting feature, please visit our docs: https://cto.ai/blog/\n",
      )
      process.exit()
    }

    const { ignoreMountWarnings } = await this._promptToIgnoreWarning(
      mountHome,
      config,
    )
    const isIgnoreFlagUndefined =
      typeof config.ignoreMountWarnings === 'undefined'

    if (isIgnoreFlagUndefined) {
      this.writeConfig(config, {
        ignoreMountWarnings,
      })
    }
  }
}
