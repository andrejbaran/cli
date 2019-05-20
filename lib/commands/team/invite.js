"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const base_1 = tslib_1.__importStar(require("../../base"));
const sdk_1 = require("@cto.ai/sdk");
const validate_1 = require("../../utils/validate");
const SENT_SUCCESSFULLY = 'sent successfully!';
const SENT_FAILURE = 'failed to send';
class TeamInvite extends base_1.default {
    constructor() {
        super(...arguments);
        this.questions = [];
    }
    async run() {
        const { flags: { inviteesInput }, argv, } = this.parse(TeamInvite);
        if (argv.length) {
            this.error('team:invite doesn\'t accept any arguments. Please use the -i flag like this: ops team:invite "user1, user2@gmail.com, user3@something"');
        }
        // Gets the active team, indicating which team to invite to
        const activeTeam = await this._getActiveTeamId();
        const invitesPrompt = this._getInvitesPrompt(activeTeam); // Structure the question to ask to the user
        if (!inviteesInput)
            this.questions.push(invitesPrompt); // Ask the question if no param is given through flag
        let invitees = inviteesInput || ''; // Initializes the invitees
        // Sets the response to the invitees question
        if (this.questions.length) {
            const res = await sdk_1.ux.prompt(this.questions);
            invitees = res && res.invitees ? res.invitees : invitees;
        }
        const inviteesArray = this._splitInvitees(invitees); // Splits the comma-delimited invitees
        // Invites the users to the team
        await this._inviteUserToTeam(activeTeam, inviteesArray)
            .then(inviteResponses => {
            this._printInviteResponses(inviteesArray, inviteResponses);
        })
            .catch(() => {
            this.error(`Failed inviting ${inviteesArray.length} users to team`);
        });
        this.analytics.track({
            userId: this.user.email,
            event: 'Ops CLI team:invite',
            properties: {
                email: this.user.email,
                username: this.user.username,
                invitees: inviteesArray,
                activeTeam,
            },
        });
    }
    // Prints the invite responses
    _printInviteResponses(inviteesArray, inviteResponses) {
        let numSuccess = 0;
        inviteResponses.forEach((inviteResponse, i) => {
            this.log(''); // Gives and empty line
            // Logs succesful invite
            if (!validate_1.validateEmail(inviteesArray[i])) {
                this.log(`❗ The format of ${sdk_1.ux.colors.red(inviteesArray[i])} is invalid, please check that it is correct and try again.`);
            }
            else if (inviteResponse.sentStatus === SENT_SUCCESSFULLY) {
                numSuccess++;
                this.log(`${sdk_1.ux.colors.green('✔')} ${sdk_1.ux.colors.white(`Invite Sent! ${inviteResponse.email}`)}`);
                // Logs unsuccessful invite
            }
            else {
                this.log(`😞 Sorry, we weren't able to complete your invite to ${sdk_1.ux.colors.red(inviteResponse.email)}. Please try again.`);
            }
        });
        // Logs the summary of invites
        if (!numSuccess) {
            this.log(`\n ${sdk_1.ux.colors.white(`❌ Invited ${numSuccess} team members`)}`);
        }
        else {
            this.log(`\n ${sdk_1.ux.colors.white(`🙌 Invited ${numSuccess} team member${numSuccess > 1 ? 's' : ''}!`)}`);
        }
    }
    // Gets the question to ask for to the user
    _getInvitesPrompt(teamInfo) {
        return {
            type: 'input',
            name: 'invitees',
            message: `\n${sdk_1.ux.colors.callOutCyan('Invite team members to')} ${sdk_1.ux.colors.reset.blue(teamInfo.name)} ${sdk_1.ux.colors.callOutCyan('and start sharing your Ops')} ${sdk_1.ux.colors.reset.green('→')}\n${sdk_1.ux.colors.white('Enter the emails of the team member that you want to invite. (Comma separated)')}
      \n\n${sdk_1.ux.colors.white('🕐 Invite User')}`,
            validate: this._validate,
        };
    }
    // Validates the input
    _validate(input) {
        // TODO Improve this validation
        return !!input;
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
    _splitInvitees(invitees) {
        return invitees
            .replace(/ /g, ',') // Replaces all whitespaces with string
            .replace(/,+/g, ',') // Handles the case of nico@cto.ai, nico+1@cto.ai
            .replace(/^,+/g, '') // Handles the case of nico@cto.ai, nico+1@cto.ai
            .replace(/,+$/g, '') // Handles the case of nico@cto.ai, nico+1@cto.ai
            .split(',');
    }
    // Obtains the active team id from the config
    async _getActiveTeamId() {
        const configData = await this.readConfig();
        // const configData = await this.readConfig()
        if (!configData || !configData.team) {
            this.error('Failed in getting active team');
        }
        return configData.team;
    }
    // Sends the invite to the team
    async _inviteUserToTeam(desiredTeam, userNameOrEmail) {
        const response = await this.api.create(`teams/${desiredTeam.id}/invites`, { UserOrEmail: userNameOrEmail }, { headers: { Authorization: this.accessToken } });
        if (response && response.data) {
            return response.data;
        }
        return [];
    }
}
TeamInvite.description = 'Invite your team members.';
// Used to specify variable length arguments
// We want to override this to give better error handling to the user
TeamInvite.strict = false;
TeamInvite.flags = {
    help: base_1.flags.help({ char: 'h' }),
    inviteesInput: base_1.flags.string({
        char: 'i',
        description: 'A comma-separated string of usernames/emails we want to invite. E.g. ("user1, user2@gmail.com, user3@something")',
    }),
};
exports.default = TeamInvite;
