import { ux } from '@cto.ai/sdk'
import Command from '~/base'
import { InviteCodeInvalid } from '~/errors/CustomErrors'
import { asyncPipe } from '~/utils'
import { Team, Config } from '~/types'

const {
  white,
  successGreen,
  primary,
  secondary,
  callOutCyan,
  errorRed,
} = ux.colors
export interface JoinInputs {
  inviteCode: string
  newTeam: Team
}

export default class TeamJoin extends Command {
  public static description = 'Accept an invite to join a team.'

  inviteCodePrompt = async (): Promise<Pick<JoinInputs, 'inviteCode'>> => {
    const { inviteCode } = await ux.prompt<{ inviteCode: string }>({
      type: 'input',
      name: 'inviteCode',
      message: `Please enter the invite code you received via email to join a team:\n\n🔑  ${white(
        'Invite code    ',
      )}`,
      validate: (input: string): boolean => !!input,
    })
    return { inviteCode }
  }
  startSpinner = (inputs: JoinInputs): JoinInputs => {
    this.log('')
    ux.spinner.start(`${white('Working on it')}`)
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
    ux.spinner.stop(`${successGreen('✔︎')}\n`)

    this.log(
      `${primary("Success! You've been added to team, ")}${callOutCyan(
        name,
      )} ${secondary('(Active)')}`,
    )
    this.log(
      `${secondary("You've been automatically switched to this team.")}\n`,
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
        event: 'Ops CLI team:join',
        properties: {
          email,
          username,
        },
      },
      this.accessToken,
    )
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
        this.logMessage,
        this.sendAnalytics(this.state.config),
      )
      await joinPipeline()
    } catch (err) {
      ux.spinner.stop(`${errorRed('failed')}\n`)
      this.debug('%O', err)
      this.config.runHook('error', {
        err,
        accessToken: this.accessToken,
      })
    }
  }
}
