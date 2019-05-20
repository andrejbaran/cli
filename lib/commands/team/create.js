"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const base_1 = tslib_1.__importStar(require("../../base"));
const customErrors_1 = require("../../errors/customErrors");
const sdk_1 = require("@cto.ai/sdk");
let self;
class TeamCreate extends base_1.default {
    constructor() {
        super(...arguments);
        this.teamNamePrompt = {
            type: 'input',
            name: 'teamName',
            message: `\nChoose a display name for your team and share ops ${sdk_1.ux.colors.reset.green('→')}  \n🏀 ${sdk_1.ux.colors.white('Team Name')} `,
            afterMessage: `${sdk_1.ux.colors.reset.green('✓')} Team name    `,
            validate: this.validateTeamName,
        };
        this.questions = [];
    }
    async run() {
        try {
            self = this;
            const { flags } = this.parse(TeamCreate);
            const { name } = flags;
            if (!name)
                this.questions.push(this.teamNamePrompt);
            let teamName = name;
            if (this.questions.length) {
                const res = await sdk_1.ux.prompt(this.questions);
                teamName = res.teamName;
            }
            else {
                const validName = name && (await this.validateTeamName(name));
                if (!validName || typeof validName === 'string') {
                    throw new customErrors_1.InvalidTeamNameFormat(null);
                }
            }
            const res = await this.api
                .create('teams', { name: teamName }, { headers: { Authorization: this.accessToken } })
                .catch(err => {
                throw new customErrors_1.InvalidTeamNameFormat(err);
            });
            const team = { id: res.data.id, name: res.data.name };
            this.log(`\n ${sdk_1.ux.colors.white('🙌 Your team has been created!')}`);
            const oldConfig = await this.readConfig();
            await this.writeConfig(oldConfig, { team });
            this.analytics.track({
                userId: this.user.email,
                event: 'Ops Team Create',
                properties: {
                    teamName: team.name,
                },
            });
        }
        catch (err) {
            this.debug(err);
        }
    }
    async validateTeamName(input) {
        try {
            if (!/^[a-zA-Z0-9-_]+$/.test(input))
                return `❗Sorry, the team name must use letters (case sensitive), numbers (0-9), and underscore (_).`;
            const unique = await self.validateUniqueField({ username: input });
            if (!unique)
                return `😞 Sorry this name has already been taken. Try again with a different name.`;
            return true;
        }
        catch (err) {
            throw new customErrors_1.InvalidTeamNameFormat(err);
        }
    }
}
TeamCreate.description = 'Create your team.';
TeamCreate.flags = {
    help: base_1.flags.help({ char: 'h' }),
    name: base_1.flags.string({ char: 'n' }),
};
exports.default = TeamCreate;
