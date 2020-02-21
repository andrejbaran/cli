import Command, { flags } from '~/base'
import { APIError, ConfigError } from '~/errors/CustomErrors'
import { InfoInputs } from '~/types'
import { asyncPipe } from '~/utils'

export default class TeamInfo extends Command {
  static description =
    'Shows basic team information for the team you are currently on.'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  getActiveTeam = async (inputs: InfoInputs): Promise<InfoInputs> => {
    try {
      const { team: activeTeam } = await this.readConfig()
      if (!activeTeam) throw new Error()
      return { ...inputs, activeTeam }
    } catch (err) {
      this.debug('%O', err)
      throw new ConfigError(err)
    }
  }

  getActiveTeamInfo = async (inputs: InfoInputs): Promise<InfoInputs> => {
    try {
      const { accessToken } = inputs.config.tokens
      const { data: members } = await this.services.api.find(
        `/private/teams/${inputs.activeTeam.name}/members`,
        {
          headers: { Authorization: accessToken },
        },
      )
      return { ...inputs, members }
    } catch (err) {
      this.debug('%O', err)
      throw new APIError(err)
    }
  }

  getActiveTeamCreator = async (inputs: InfoInputs): Promise<InfoInputs> => {
    try {
      const { accessToken } = inputs.config.tokens
      const { data: creator } = await this.services.api.find(
        `/private/teams/${inputs.activeTeam.name}/creator`,
        {
          headers: { Authorization: accessToken },
        },
      )
      return { ...inputs, creator }
    } catch (err) {
      this.debug('%O', err)
      throw new APIError(err)
    }
  }

  logTeamInfo = (inputs: InfoInputs): InfoInputs => {
    const { members, creator, activeTeam } = inputs
    this.log('')
    this.ux.table([activeTeam], {
      team: {
        get: row => row.name,
        minWidth: 40,
      },
      creationDate: {
        header: 'Creation Date',
        get: () => new Date(creator.createdAt).toLocaleDateString(),
      },
    })
    this.log('')
    members.sort((a, b) => {
      return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
    })
    this.ux.table(
      members,
      {
        members: {
          get: row => row.username,
          minWidth: 40,
        },
        joinDate: {
          header: 'Join Date',
          get: row => new Date(row.createdAt).toLocaleDateString(),
        },
        creator: {
          header: ' ',
          get: row => (row.userId !== creator.userId ? '' : 'Creator'),
        },
      },
      { sort: '-creator' },
    )
    this.log(' ')
    return inputs
  }

  sendAnalytics = async (inputs: InfoInputs) => {
    const {
      config: {
        user: { email, username },
        tokens: { accessToken },
      },
      activeTeam: { name: activeTeamName },
    } = inputs
    await this.services.analytics.track(
      {
        userId: email,
        cliEvent: 'Ops CLI Team:Info',
        event: 'Ops CLI Team:Info',
        properties: {
          email,
          username,
          activeTeamName,
        },
      },
      accessToken,
    )
  }
  startSpinner = async (inputs: InfoInputs) => {
    await this.ux.spinner.start(
      `🔍 ${this.ux.colors.white('Getting your active team information')}`,
    )
    return inputs
  }
  stopSpinner = async (inputs: InfoInputs) => {
    await this.ux.spinner.stop(`${this.ux.colors.successGreen('Done')}`)
    return inputs
  }
  async run() {
    await this.parse(TeamInfo)
    const config = await this.isLoggedIn()
    try {
      const infoPipeline = asyncPipe(
        this.startSpinner,
        this.getActiveTeam,
        this.getActiveTeamInfo,
        this.getActiveTeamCreator,
        this.stopSpinner,
        this.logTeamInfo,
        this.sendAnalytics,
      )

      await infoPipeline({ config })
    } catch (err) {
      await this.ux.spinner.stop(`${this.ux.colors.errorRed('Failed')}`)
      this.debug('%O', err)
      this.config.runHook('error', {
        err,
        accessToken: config.tokens.accessToken,
      })
    }
  }
}
