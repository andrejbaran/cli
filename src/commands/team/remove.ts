import fuzzy from 'fuzzy'
import Command, { flags } from '~/base'
import { asyncPipe } from '~/utils'
import { TeamRemoveInputs as Inputs, Answers, Fuzzy, Membership } from '~/types'
import {
  APIError,
  NoMemberFound,
  FailedToRemoveMemberFromTeam,
  NoMembersFound,
} from '~/errors/CustomErrors'

export default class TeamRemove extends Command {
  static description = 'Remove your team members.'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  static args = [
    {
      name: 'member',
      description:
        'The username of the team member you want to remove from the team.',
      parse: (input: string) => input.toLowerCase(),
    },
  ]

  members: (Membership)[] = []

  getActiveTeamCreator = async (inputs: Inputs): Promise<Inputs> => {
    try {
      const {
        tokens: { accessToken },
        team: { name },
      } = inputs.config
      const { data: creator } = await this.services.api.find(
        `/private/teams/${name}/creator`,
        {
          headers: { Authorization: accessToken },
        },
      )
      return { ...inputs, creator }
    } catch (err) {
      this.debug('%O', err)
      throw new APIError(err)
    }
  }

  getActiveTeamMembers = async (inputs: Inputs): Promise<Inputs> => {
    try {
      const {
        tokens: { accessToken },
        team: { name: activeTeamName },
      } = inputs.config
      const { data: members } = await this.services.api.find(
        `/private/teams/${activeTeamName}/members`,
        {
          headers: { Authorization: accessToken },
        },
      )
      return { ...inputs, members }
    } catch (err) {
      this.debug('%O', err)
      throw new APIError(err)
    }
  }

  filterOutCreatorAndCurrentUser = async (inputs: Inputs): Promise<Inputs> => {
    const {
      creator: { userId: creatorId },
      config: {
        user: { id: activeUserId },
      },
    } = inputs
    const members = inputs.members.filter(member => {
      return member.userId != creatorId && member.userId != activeUserId
    })
    return { ...inputs, members }
  }

  checkForArgMember = async (inputs: Inputs): Promise<Inputs> => {
    if (!inputs.memberArg) return inputs
    const {
      members,
      memberArg,
      config: {
        team: { name: teamName },
      },
    } = inputs
    const memberToRemove = members.find(member => {
      return member.username === memberArg
    })
    if (memberToRemove) return { ...inputs, memberToRemove }
    throw new NoMemberFound(memberArg, teamName)
  }

  selectMemberToRemove = async (inputs: Inputs): Promise<Inputs> => {
    if (inputs.memberToRemove) return inputs
    if (inputs.members.length === 0) {
      throw new NoMembersFound()
    }
    this.members = inputs.members
    const {
      team: { name: activeTeamName },
    } = inputs.config
    const { memberToRemove } = await this.ux.prompt({
      type: 'autocomplete',
      name: 'memberToRemove',
      message: `Select a member to remove from ${activeTeamName}`,
      source: this._autocompleteSearch.bind(this),
    })

    return { ...inputs, memberToRemove }
  }
  _autocompleteSearch = async (_: Answers, input = '') => {
    const { list, options } = this._fuzzyFilterParams()
    const fuzzyResult: Fuzzy[] = fuzzy.filter(input, list, options)
    return fuzzyResult.map(result => result.original)
  }

  _fuzzyFilterParams = () => {
    const list = this.members.map(member => {
      return {
        name: member.username,
        value: member,
      }
    })
    const options = { extract: el => el.name }
    return { list, options }
  }

  confirmMemberRemove = async (inputs: Inputs): Promise<Inputs> => {
    const {
      memberToRemove: { username },
      config: {
        team: { name: activeTeamName },
      },
    } = inputs
    const { actionBlue } = this.ux.colors
    const { confirmRemove } = await this.ux.prompt({
      type: 'confirm',
      name: 'confirmRemove',
      suffix: false,
      message: `Are you sure you want to remove ${actionBlue(
        username,
      )} from ${actionBlue(activeTeamName)}?`,
    })
    if (!confirmRemove) process.exit()
    return inputs
  }

  removeMemberFromTeam = async (inputs: Inputs): Promise<Inputs> => {
    const {
      memberToRemove: { userId, username },
      config: {
        team: { name: activeTeamName },
        tokens: { accessToken },
      },
    } = inputs
    try {
      await this.services.api.remove(
        `/private/teams/${activeTeamName}/members`,
        userId,
        {
          headers: { Authorization: accessToken },
        },
      )
      return inputs
    } catch (err) {
      throw new FailedToRemoveMemberFromTeam(err, username, activeTeamName)
    }
  }

  successRemoveMessage = async (inputs: Inputs): Promise<Inputs> => {
    const {
      memberToRemove: { username },
      config: {
        team: { name: activeTeamName },
      },
    } = inputs
    const { white, callOutCyan } = this.ux.colors
    this.log(
      white(
        ` 👌 ${callOutCyan(
          username,
        )} was sucessfully removed from ${callOutCyan(activeTeamName)}`,
      ),
    )
    return inputs
  }

  sendAnalytics = async (inputs: Inputs): Promise<void> => {
    const {
      config: {
        user: { email, username },
        tokens: { accessToken },
        team: { name: activeTeamName },
      },
    } = inputs
    await this.services.analytics.track(
      {
        userId: email,
        cliEvent: 'Ops CLI Team:Remove',
        event: 'Ops CLI Team:Remove',
        properties: {
          email,
          username,
          activeTeamName,
        },
      },
      accessToken,
    )
  }

  async run() {
    const {
      args: { member: memberArg },
    } = this.parse(TeamRemove)
    const config = await this.isLoggedIn()
    try {
      const teamRemovePipeline = asyncPipe(
        this.getActiveTeamMembers,
        this.getActiveTeamCreator,
        this.filterOutCreatorAndCurrentUser,
        this.checkForArgMember,
        this.selectMemberToRemove,
        this.confirmMemberRemove,
        this.removeMemberFromTeam,
        this.successRemoveMessage,
        this.sendAnalytics,
      )

      await teamRemovePipeline({ config, memberArg })
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', {
        err,
        accessToken: config.tokens.accessToken,
      })
    }
  }
}
