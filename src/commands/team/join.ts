import { ux } from '@cto.ai/sdk'
import { Question } from '~/types'
import Command from '../../base'
import { InviteCodeInvalid } from '../../errors/CustomErrors'

const inviteCodePrompt: Question = {
  type: 'input',
  name: 'inviteCode',
  message: `Please enter the invite code you received via email to join a team:\n\n🔑  ${ux.colors.white(
    'Invite code    ',
  )}`,
}

export default class TeamJoin extends Command {
  public static description = 'Accept an invite to join a team.'

  public startSpinner() {
    this.log('')
    ux.spinner.start(`${ux.colors.white('Working on it')}`)
  }

  public async run() {
    this.isLoggedIn()
    const { inviteCode } = await ux.prompt<{ inviteCode: string }>(
      inviteCodePrompt,
    )
    this.startSpinner()
    if (!inviteCode) {
      throw new Error('no invite code')
    }
    const res = await this.joinTeam(inviteCode).catch(err => {
      this.debug('%O', err)
      throw new InviteCodeInvalid(err)
    })

    // On failure
    if (!res || !res.data) {
      throw new InviteCodeInvalid(null)
    }

    // On success
    const { id, name } = res.data
    const oldConfig = await this.readConfig()
    await this.writeConfig(oldConfig, { team: { name, id } })

    ux.spinner.stop(`${ux.colors.successGreen('✔︎')}\n`)

    this.log(
      `${ux.colors.primary(
        "Success! You've been added to team, ",
      )}${ux.colors.callOutCyan(name)} ${ux.colors.secondary('(Active)')}`,
    )
    this.log(
      `${ux.colors.secondary(
        "You've been automatically switched to this team.",
      )}\n`,
    )
    this.log(`Try running this command to get started:\n\n$ ops search`)

    this.analytics.track({
      userId: this.user.email,
      event: 'Ops CLI team:join',
      properties: {
        email: this.user.email,
        username: this.user.username,
        team: { id, name },
      },
    })
    return
  }

  public async joinTeam(inviteCode: string) {
    return this.api.create(
      'teams/accept',
      { inviteCode },
      { headers: { Authorization: this.accessToken } },
    )
  }
}
