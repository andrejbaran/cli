"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const base_1 = tslib_1.__importDefault(require("../../base"));
const sdk_1 = require("@cto.ai/sdk");
const customErrors_1 = require("../../errors/customErrors");
const inviteCodePrompt = {
    type: 'input',
    name: 'inviteCode',
    message: `Please enter the invite code you received via email to join a team:\n\n🔑  ${sdk_1.ux.colors.white('Invite code    ')}`,
};
class TeamJoin extends base_1.default {
    startSpinner() {
        this.log('');
        sdk_1.ux.spinner.start(`${sdk_1.ux.colors.white('Working on it')}`);
    }
    async run() {
        const { inviteCode } = await sdk_1.ux.prompt([
            inviteCodePrompt,
        ]);
        this.startSpinner();
        const res = await this.joinTeam(inviteCode).catch(err => {
            throw new customErrors_1.InviteCodeInvalid(err);
        });
        // On failure
        if (!res || !res.data)
            throw new customErrors_1.InviteCodeInvalid(null);
        // On success
        const { id, name } = res.data;
        const oldConfig = await this.readConfig();
        await this.writeConfig(oldConfig, { team: { name, id } });
        sdk_1.ux.spinner.stop(`${sdk_1.ux.colors.successGreen('✔︎')}\n`);
        this.log(`${sdk_1.ux.colors.primary("Success! You've been added to team, ")}${sdk_1.ux.colors.callOutCyan(name)} ${sdk_1.ux.colors.secondary('(Active)')}`);
        this.log(`${sdk_1.ux.colors.secondary("You've been automatically switched to this team.")}\n`);
        this.log(`Try these commands to get started:\n\n$ ops list\n$ ops search`);
        this.analytics.track({
            userId: this.user.email,
            event: 'Ops CLI team:join',
            properties: {
                email: this.user.email,
                username: this.user.username,
                team: { id, name },
            },
        });
        return;
    }
    async joinTeam(inviteCode) {
        return this.api.create('teams/accept', { inviteCode }, { headers: { Authorization: this.accessToken } });
    }
}
TeamJoin.description = 'Accept an invite to join a team.';
exports.default = TeamJoin;
