import Command from '../../base'
import { ux } from '@cto.ai/sdk'

const inviteCodePrompt = {
  type: 'input',
  name: 'inviteCode',
  message: `Please enter the invite code you received via email to join a team:\n\n🔑  ${ux.colors.white(
    'Invite code    ',
  )}`,
}

export default class TeamJoin extends Command {
  static description = 'Accept an invite to join a team'

  startSpinner() {
    this.log('')
    ux.spinner.start(`${ux.colors.white('Working on it')}`)
  }

  async run() {
    const { inviteCode }: { inviteCode: string } = await ux.prompt([
      inviteCodePrompt,
    ])
    this.startSpinner()
    const res = await this.joinTeam(inviteCode)

    // On success
    if (res.data) {
      const { id, name } = res.data
      await this.writeConfig({ team: { name, id } })

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
      this.log(`Try these commands to get started:\n\n$ ops list\n$ ops search`)
      return
    }

    // On failure
    ux.spinner.stop(`${ux.colors.green('❗️\n')}`)
    this.log(
      `😞  Uh-oh, the invite code doesn't seem to be valid. Please check the code and try again.\n`,
    )
    return this.run()
  }
}
