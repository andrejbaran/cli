import { ux } from '@cto.ai/sdk'
import Command, { flags } from '~/base'
import { InvalidTeamNameFormat } from '~/errors/CustomErrors'
import { Team } from '~/types'
import { asyncPipe, validChars } from '~/utils'

const { white, reset } = ux.colors

export interface CreateInputs {
  name: string | undefined
  team: Team
}
export default class TeamCreate extends Command {
  public static description = 'Create your team.'

  public static flags = {
    help: flags.help({ char: 'h' }),
    name: flags.string({ char: 'n' }),
  }

  guardAgainstInvalidName = async (
    name: string | undefined,
  ): Promise<Pick<CreateInputs, 'name'>> => {
    try {
      if (!name) return { name }
      const isValidName = await this.validateTeamName(name)
      if (!isValidName || typeof isValidName === 'string') {
        throw new InvalidTeamNameFormat(null)
      }
      return { name }
    } catch (err) {
      this.debug('%0', err)
      throw err
    }
  }

  promptForTeamName = async (inputs): Promise<Pick<CreateInputs, 'name'>> => {
    if (inputs.name) {
      return inputs
    }
    const { name } = await ux.prompt<{ name: string }>({
      type: 'input',
      name: 'name',
      message: `\nChoose a display name for your team and share ops ${reset.green(
        '→',
      )}  \n🏀 ${white('Team Name')} `,
      afterMessage: `${reset.green('✓')} Team name    `,
      validate: this.validateTeamName.bind(this),
    })
    return { name }
  }

  createTeam = async (inputs: CreateInputs): Promise<CreateInputs> => {
    try {
      const { name } = inputs
      const res: { data: Team } = await this.api.create(
        'teams',
        { name },
        { headers: { Authorization: this.accessToken } },
      )

      const team: Team = { id: res.data.id, name: res.data.name }
      return { ...inputs, team }
    } catch (err) {
      this.debug('%O', err)
      throw new InvalidTeamNameFormat(err)
    }
  }

  logMessage = (inputs: CreateInputs): CreateInputs => {
    this.log(`\n ${white('🙌 Your team has been created!')}`)
    return inputs
  }

  setTeamConfig = async (inputs: CreateInputs): Promise<CreateInputs> => {
    const { team } = inputs
    const oldConfig = await this.readConfig()
    await this.writeConfig(oldConfig, { team })
    return inputs
  }

  sendAnalytics = (userId: string) => (inputs: CreateInputs): void => {
    const {
      team: { id: teamId, name },
    } = inputs
    this.analytics.track(
      {
        event: 'Ops Team Create',
        userId,
        teamId,
        properties: {
          teamName: name,
        },
      },
      this.accessToken,
    )
  }

  validateTeamName = async (name: string): Promise<boolean | string> => {
    try {
      if (!validChars.test(name)) {
        return `Invalid team name. May contain only letters (case-sensitive), numbers, dashes (-), and underscores (_).`
      }
      const unique = await this.validateUniqueField({ username: name })
      if (!unique) {
        return `😞 Sorry this name has already been taken. Try again with a different name.`
      }
      return true
    } catch (err) {
      throw new InvalidTeamNameFormat(err)
    }
  }

  async run(): Promise<void> {
    try {
      this.isLoggedIn()
      let {
        flags: { name },
      } = this.parse(TeamCreate)

      const createPipeline = asyncPipe(
        this.guardAgainstInvalidName,
        this.promptForTeamName,
        this.createTeam,
        this.logMessage,
        this.setTeamConfig,
        this.sendAnalytics(this.user.email),
      )

      await createPipeline(name)
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err })
    }
  }
}
