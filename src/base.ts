process.env.NODE_ENV = process.env.NODE_ENV || 'production'

import Command, {flags} from '@oclif/command'
import axios from 'axios'
import {outputJson, readJson} from 'fs-extra'
import * as path from 'path'

import Config from './types/config'
import getDocker from './utils/get-docker'

const {ux} = require('@cto.ai/sdk')
const feathers = require('@feathersjs/feathers')
const rest = require('@feathersjs/rest-client')

const ops_segment_key = process.env.OPS_SEGMENT_KEY || 'sRsuG18Rh9IHgr9bK7GsrB7BfLfNmhCG'
const ops_host = process.env.OPS_API_HOST || 'https://cto.ai/'
const ops_path = process.env.OPS_API_PATH || 'api/v1'
const api = axios.create({baseURL: ops_host + ops_path})

let Analytics = require('analytics-node')

export default abstract class extends Command {
  client = feathers().configure(rest(ops_host + ops_path).axios(axios))
  analytics = new Analytics(ops_segment_key)
  accessToken = ''
  user = {}
  api = api
  docker

  async init() {
    const {accessToken, user} = await this.readConfig()
    this.user = user
    this.accessToken = accessToken
    this.docker = await this._getDocker()
  }

  public isLoggedIn() {
    if (!this.user) {
      this.log('')
      this.log('✋ Sorry you need to be loggedin to do that.')
      this.log(`🎳 You can sign up with ${ux.colors.green('$')} ${ux.colors.dim('ops account:signup')}`)
      this.log('')
      this.log('❔ Please reach out to us with questions anytime!')
      this.log(`⌚️ We are typically available ${ux.colors.white('Monday-Friday 9am-5pm PT')}.`)
      this.log(`📬 You can always reach us by ${ux.url('email', 'mailto:h1gw0mit@ctoai.intercom-mail.com')} ${ux.colors.dim('(h1gw0mit@ctoai.intercom-mail.com)')}.\n`)
      this.log("🖖 We'll get back to you as soon as we possibly can.")
      this.log('')

      this.exit()
    }
  }

  public async readConfig(): Promise<Config> {
    return Promise.resolve(
      await readJson(path.join(this.config.configDir, 'config.json'))
        .catch(() => {
          return {}
        })
    )
  }

  public async writeConfig(newConfig: object): Promise<void> {
    const oldConfig = await this.readConfig()
    return Promise.resolve(
      await outputJson(path.join(this.config.configDir, 'config.json'), {...oldConfig, ...newConfig})
    )
  }

  public async localAuthenticate(email: any, password: string) {
    return Promise.resolve(
      await this.client.service('auth').create({strategy: 'local', email, password})
    )
  }
  private async _getDocker() {
    if (process.env.NODE_ENV === 'test') return
    const self = this
    return getDocker(self, 'base')
  }
}

export {flags}
