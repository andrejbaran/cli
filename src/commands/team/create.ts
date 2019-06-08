import Command, { flags } from '../../base'
import { InvalidTeamNameFormat } from '../../errors/customErrors'
import { validChars } from '../../utils/validate'

import { Question, Team } from '~/types'

let self
export default class TeamCreate extends Command {
  static description = 'Create your team.'

  static flags = {
    help: flags.help({ char: 'h' }),
    name: flags.string({ char: 'n' }),
  }

  teamNamePrompt: Question = {
    type: 'input',
    name: 'teamName',
    message: `\nChoose a display name for your team and share ops ${this.ux.colors.reset.green(
      '→',
    )}  \n🏀 ${this.ux.colors.white('Team Name')} `,
    afterMessage: `${this.ux.colors.reset.green('✓')} Team name    `,
    validate: this.validateTeamName,
  }
  questions: Question[] = []

  async run(): Promise<void> {
    try {
      this.isLoggedIn()
      self = this
      const { flags } = this.parse(TeamCreate)
      const { name } = flags
      if (!name) this.questions.push(this.teamNamePrompt)
      let teamName = name
      if (this.questions.length) {
        const {
          promptedTeamName,
        }: { promptedTeamName: string } = await this.ux.prompt(this.questions)
        teamName = promptedTeamName
      } else {
        const validName = name && (await this.validateTeamName(name))
        if (!validName || typeof validName === 'string') {
          throw new InvalidTeamNameFormat(null)
        }
      }

      const res: { data: Team } = await this.api
        .create(
          'teams',
          { name: teamName },
          { headers: { Authorization: this.accessToken } },
        )
        .catch(err => {
          this.debug(err)
          throw new InvalidTeamNameFormat(err)
        })
      const team = { id: res.data.id, name: res.data.name }

      this.log(`\n ${this.ux.colors.white('🙌 Your team has been created!')}`)

      const oldConfig = await this.readConfig()
      await this.writeConfig(oldConfig, { team })

      this.analytics.track({
        userId: this.user.email,
        event: 'Ops Team Create',
        properties: {
          teamName: team.name,
        },
      })
    } catch (err) {
      this.debug(err)
    }
  }

  async validateTeamName(input: string): Promise<boolean | string> {
    try {
      if (!validChars.test(input))
        return `❗Sorry, the team name must use letters (case sensitive), numbers (0-9), dashes (-), and underscores (_).`
      const unique = await self.validateUniqueField({ username: input })
      if (!unique)
        return `😞 Sorry this name has already been taken. Try again with a different name.`
      return true
    } catch (err) {
      this.debug(err)
      throw new InvalidTeamNameFormat(err)
    }
  }
}
