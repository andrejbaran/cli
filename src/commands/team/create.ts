import Command, { flags } from '../../base'
const { ux } = require('@cto.ai/sdk')

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
        this.log('Sorry that name is invalid, Please try a different name')
        process.exit()
      }
    }

    // REQUEST TO FEATHERS API
    const res = await this.client
      .service('teams')
      .create(
        { name: teamName },
        { headers: { Authorization: this.accessToken } },
      )
    const team = { id: res.data.id, name: res.data.name }

    this.log(`\n ${ux.colors.white('🙌 Your team has been created!')}`)
    await this.writeConfig({ team })

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
      if (!/^[a-zA-Z0-9-_]+$/.test(input)) return 'Invalid name format'
      const unique = await self.validateUniqueField({ username: input })
      if (!unique) return 'Name already taken'
      return true
    } catch (err) {
      return 'Unable to validate team name.'
    }
  }
}
