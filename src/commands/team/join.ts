import Command from '~/base'
import { InviteCodeInvalid } from '~/errors/CustomErrors'
import { asyncPipe } from '~/utils'
import { Team, Config } from '~/types'

export interface JoinInputs {
  inviteCode: string
  newTeam: Team
}

export default class TeamJoin extends Command {
  public static description = 'Accept an invite to join a team.'

  inviteCodePrompt = async (): Promise<Pick<JoinInputs, 'inviteCode'>> => {
    const { inviteCode } = await this.ux.prompt<{ inviteCode: string }>({
      type: 'input',
      name: 'inviteCode',
      message: `Please enter the invite code you received via email to join a team:\n\n🔑  ${this.ux.colors.white(
        'Invite code    ',
      )}`,
      validate: (input: string): boolean => !!input,
    })
    return { inviteCode }
  }
  startSpinner = async (inputs: JoinInputs) => {
    this.log('')
    await this.ux.spinner.start(`${this.ux.colors.white('Working on it')}`)
    return inputs
  }
  joinTeam = async (inputs: JoinInputs): Promise<JoinInputs> => {
    try {
      const { inviteCode } = inputs
      const { data: newTeam } = await this.services.api.create(
        'teams/accept',
        { inviteCode },
        { headers: { Authorization: this.accessToken } },
      )
      if (!newTeam) throw new InviteCodeInvalid(null)
      return { ...inputs, newTeam }
    } catch (err) {
      this.debug('%O', err)
      throw new InviteCodeInvalid(err)
    }
  }

  setActiveTeam = async (inputs: JoinInputs): Promise<JoinInputs> => {
    const {
      newTeam: { id, name },
    } = inputs
    const oldConfig = await this.readConfig()
    await this.writeConfig(oldConfig, { team: { name, id } })
    return inputs
  }

  logMessage = (inputs: JoinInputs): JoinInputs => {
    const {
      newTeam: { name },
    } = inputs

    this.log(
      `${this.ux.colors.primary(
        "Success! You've been added to team, ",
      )}${this.ux.colors.callOutCyan(name)} ${this.ux.colors.secondary(
        '(Active)',
      )}`,
    )
    this.log(
      `${this.ux.colors.secondary(
        "You've been automatically switched to this team.",
      )}\n`,
    )
    this.log(`Try running this command to get started:\n\n$ ops search`)
    return inputs
  }

  sendAnalytics = (config: Config) => (inputs: JoinInputs): void => {
    const {
      newTeam: { id: teamId },
    } = inputs
    const {
      user: { email, username },
    } = config
    this.services.analytics.track(
      {
        userId: email,
        teamId,
        cliEvent: 'Ops CLI team:join',
        event: 'Ops CLI team:join',
        properties: {
          email,
          username,
        },
      },
      this.accessToken,
    )
  }

  stopSpinner = async (inputs: JoinInputs) => {
    await this.ux.spinner.stop(`${this.ux.colors.successGreen('Done')}`)
    return inputs
  }

  async run() {
    this.parse(TeamJoin)
    try {
      await this.isLoggedIn()
      const joinPipeline = asyncPipe(
        this.inviteCodePrompt,
        this.startSpinner,
        this.joinTeam,
        this.setActiveTeam,
        this.stopSpinner,
        this.logMessage,
        this.sendAnalytics(this.state.config),
      )
      await joinPipeline()
    } catch (err) {
      this.ux.spinner.stop(`${this.ux.colors.errorRed('Failed')}`)
      this.debug('%O', err)
      this.config.runHook('error', {
        err,
        accessToken: this.accessToken,
      })
    }
  }
}
