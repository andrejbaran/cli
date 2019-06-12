import Command, { flags } from '../../base'
import { InvalidTeamNameFormat } from '../../errors/customErrors'
import { validChars } from '../../utils/validate'

import { Question, Team } from '~/types'

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
    validate: this.validateTeamName.bind(this),
  }

  async promptForTeamName(): Promise<string> {
    const { teamName } = await this.ux.prompt<{ teamName: string }>(
      this.teamNamePrompt,
    )
    return teamName
  }

  async guardAgainstInvalidName(name: undefined | string): Promise<void> {
    if (!name) return
    const isValidName = await this.validateTeamName(name)
    if (!isValidName || typeof isValidName === 'string') {
      throw new InvalidTeamNameFormat(null)
    }
  }

  async run(): Promise<void> {
    try {
      this.isLoggedIn()
      const { flags } = this.parse(TeamCreate)
      let { name } = flags

      // we run this check only against the name passed as an argument, not the
      // prompted name. This is because validation is built-in to the prompt.
      await this.guardAgainstInvalidName(name)

      if (!name) {
        name = await this.promptForTeamName()
      }

      const res: { data: Team } = await this.api
        .create(
          'teams',
          { name },
          { headers: { Authorization: this.accessToken } },
        )
        .catch(err => {
          this.debug('%O', err)
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
      this.debug('%O', err)
      this.config.runHook('error', { err })
    }
  }

  async validateTeamName(input: string): Promise<boolean | string> {
    try {
      if (!validChars.test(input))
        return `Invalid team name. May contain only letters (case-sensitive), numbers, dashes (-), and underscores (_).`
      const unique = await this.validateUniqueField({ username: input })
      if (!unique)
        return `😞 Sorry this name has already been taken. Try again with a different name.`
      return true
    } catch (err) {
      throw new InvalidTeamNameFormat(err)
    }
  }
}
