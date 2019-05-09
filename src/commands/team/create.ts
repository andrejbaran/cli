import Command, { flags } from '../../base'
import { InvalidTeamNameFormat } from '../../errors/customErrors'
import { ux } from '@cto.ai/sdk'

let self
export default class TeamCreate extends Command {
  static description = 'Create your team.'

  static flags = {
    help: flags.help({ char: 'h' }),
    name: flags.string({ char: 'n' }),
  }

  teamNamePrompt = {
    type: 'input',
    name: 'teamName',
    message: `\nChoose a display name for your team and share ops ${ux.colors.reset.green(
      '→',
    )}  \n🏀 ${ux.colors.white('Team Name')} `,
    afterMessage: `${ux.colors.reset.green('✓')} Team name    `,
    validate: this.validateTeamName,
  }
  questions: object[] = []

  async run(): Promise<void> {
    self = this
    const { flags } = this.parse(TeamCreate)
    const { name } = flags
    if (!name) this.questions.push(this.teamNamePrompt)
    let teamName = name
    if (this.questions.length) {
      const res = await ux.prompt(this.questions)
      teamName = res.teamName
    } else {
      const validName = name && (await this.validateTeamName(name))
      if (!validName || typeof validName === 'string') {
        throw new InvalidTeamNameFormat(null)
      }
    }

    const res = await this.api
      .create(
        'teams',
        { name: teamName },
        { headers: { Authorization: this.accessToken } },
      )
      .catch(err => {
        throw new InvalidTeamNameFormat(err)
      })
    const team = { id: res.data.id, name: res.data.name }

    this.log(`\n ${ux.colors.white('🙌 Your team has been created!')}`)

    const oldConfig = await this.readConfig()
    await this.writeConfig(oldConfig, { team })

    this.analytics.track({
      userId: this.user.email,
      event: 'Ops Team Create',
      properties: {
        teamName: team.name,
      },
    })
  }

  async validateTeamName(input: string): Promise<boolean | string> {
    try {
      if (!/^[a-zA-Z0-9-_]+$/.test(input))
        return `❗Sorry, the team name must use letters (case sensitive), numbers (0-9), and underscore (_).`
      const unique = await self.validateUniqueField({ username: input })
      if (!unique)
        return `😞 Sorry this name has already been taken. Try again with a different name.`
      return true
    } catch (err) {
      throw new InvalidTeamNameFormat(err)
    }
  }
}
