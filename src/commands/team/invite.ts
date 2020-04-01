import { ux } from '@cto.ai/sdk'
import Command, { flags } from '~/base'
import { Config, Team, Invite } from '~/types'
import { asyncPipe, validateEmail } from '~/utils'
import { InviteSendingInvite } from '~/errors/CustomErrors'

const { white, red, callOutCyan, green, reset } = ux.colors

export interface InviteInputs {
  config: Config
  invitees: string
  inviteesArray: string[]
  team: Team
  inviteResponses: Invite[]
}
export default class TeamInvite extends Command {
  public static description = 'Invite your team members.'

  static strict = false

  public static flags = {
    help: flags.help({ char: 'h' }),
    invitees: flags.string({
      char: 'i',
      description:
        'A comma-separated string of usernames/emails we want to invite. E.g. ("user1, user2@gmail.com, user3@something")',
    }),
  }

  getInvitesPrompt = async (inputs: InviteInputs): Promise<InviteInputs> => {
    if (inputs.invitees) return inputs
    const {
      config: { team },
    } = inputs
    const { invitees } = await ux.prompt({
      type: 'input',
      name: 'invitees',
      message: `\n${callOutCyan('Invite team members to')} ${reset.blue(
        team.name,
      )} ${callOutCyan('and start sharing your Ops')} ${reset.green(
        '→',
      )}\n${white(
        'Enter the emails of the team member(s) that you want to invite as a comma-separated list.',
      )}
      \n\n${white('🎟  Invite User')}`,
      validate: (input: string): string | boolean => !!input,
    })
    return { ...inputs, invitees }
  }

  /**
   * Splits the invitees by either string or space
   * Handles the case of:
   * "username1,username2,username3" => ["username1", "username2", "username3"]
   * "username1, username2, username3" => ["username1", "username2", "username3"]
   * "username1 username2 username3" => ["username1", "username2", "username3"]
   * "username1,username2 username3" => ["username1", "username2", "username3"]
   * ", username1      ,   username2,,,,,,      username3 ,," => ["username1", "username2", "username3"]
   */
  splitInvitees = (inputs: InviteInputs): InviteInputs => {
    const inviteesArray = inputs.invitees
      .replace(/ /g, ',') // Replaces all whitespaces with string
      .replace(/,+/g, ',') // Handles the case of nico@cto.ai, nico+1@cto.ai
      .replace(/^,+/g, '') // Handles the case of nico@cto.ai, nico+1@cto.ai
      .replace(/,+$/g, '') // Handles the case of nico@cto.ai, nico+1@cto.ai
      .split(',')
    return { ...inputs, inviteesArray }
  }

  inviteUserToTeam = async (inputs: InviteInputs): Promise<InviteInputs> => {
    const {
      config: {
        team: { id },
      },
      inviteesArray,
    } = inputs
    try {
      const filteredInviteesArray: string[] = inviteesArray.filter(invitee =>
        validateEmail(invitee),
      )
      const {
        data: inviteResponses,
      }: { data: Invite[] } = await this.services.api.create(
        `/private/teams/${id}/invites`,
        { UserOrEmail: filteredInviteesArray },
        { headers: { Authorization: this.accessToken } },
      )
      return { ...inputs, inviteResponses }
    } catch (err) {
      this.debug('%O', err)
      throw new InviteSendingInvite(err)
    }
  }

  printInviteResponses = (inputs: InviteInputs): InviteInputs => {
    const { inviteResponses, inviteesArray } = inputs
    let numSuccess = 0
    this.log('') // Gives and empty line
    inviteResponses.forEach(inviteResponse => {
      // Logs succesful invite
      if (inviteResponse.sentStatus === 'sent successfully!') {
        numSuccess++
        this.log(
          `${green('✔')} ${white(`Invite Sent! ${inviteResponse.email}`)}`,
        )
        // Logs unsuccessful invite
      } else {
        this.log(
          `😞 Sorry, we weren't able to complete your invite to ${red(
            inviteResponse.email,
          )}. Please try again.`,
        )
      }
    })
    inviteesArray
      .filter(invitee => !validateEmail(invitee))
      .forEach(invalidEmailInvitee => {
        this.log(
          `❗ The format of ${ux.colors.red(
            invalidEmailInvitee,
          )} is invalid, please check that it is correct and try again.`,
        )
      })
    // Logs the summary of invites
    if (!numSuccess) {
      this.log(`\n ${white(`❌ Invited ${numSuccess} team members`)}`)
    } else {
      this.log(
        `\n ${white(
          `🙌 Invited ${numSuccess} team member${numSuccess > 1 ? 's' : ''}!`,
        )}`,
      )
    }
    return inputs
  }

  sendAnalytics = (config: Config) => (inputs: InviteInputs): void => {
    const { inviteesArray } = inputs
    const {
      user: { email, username },
      team: { id: teamId },
    } = config
    this.services.analytics.track(
      {
        userId: email,
        teamId,
        cliEvent: 'Ops CLI Team:Invite',
        event: 'Ops CLI Team:Invite',
        properties: {
          email,
          username,
          invitees: inviteesArray,
        },
      },
      this.accessToken,
    )
  }

  async run(): Promise<void> {
    const {
      flags: { invitees },
      argv,
    } = this.parse(TeamInvite)
    try {
      await this.isLoggedIn()
      if (argv.length) {
        throw new Error(
          'team:invite doesn\'t accept any arguments. Please use the -i flag like this: ops team:invite "user1, user2@gmail.com, user3@something"',
        )
      }

      const invitePipeline = asyncPipe(
        this.getInvitesPrompt,
        this.splitInvitees,
        this.inviteUserToTeam,
        this.printInviteResponses,
        this.sendAnalytics(this.state.config),
      )

      await invitePipeline({ invitees, config: this.state.config })
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
