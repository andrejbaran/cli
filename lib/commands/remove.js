"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const base_1 = tslib_1.__importStar(require("../base"));
const sdk_1 = require("@cto.ai/sdk");
const env_1 = require("../constants/env");
const customErrors_1 = require("../errors/customErrors");
class Remove extends base_1.default {
    async run() {
        try {
            const self = this;
            this.isLoggedIn();
            const { args: { opName }, } = this.parse(Remove);
            const query = opName
                ? { search: opName, team_id: self.team.id }
                : { team_id: self.team.id };
            const opsResponse = await this.api
                .find('ops', {
                query,
                headers: {
                    Authorization: this.accessToken,
                },
            })
                .catch(err => {
                throw new Error(err);
            });
            if (!opsResponse.data.length) {
                throw new customErrors_1.NoOpFoundForDeletion();
            }
            let op;
            if (!opName) {
                const data = await sdk_1.ux.prompt({
                    type: 'list',
                    name: 'selected',
                    pageSize: 100,
                    message: '\n 🗑  Which op would you like to remove?',
                    choices: opsResponse.data.map(l => {
                        return {
                            name: `${sdk_1.ux.colors.callOutCyan(l.name)} ${sdk_1.ux.colors.white(l.description)} | id: ${sdk_1.ux.colors.white(l.id.toLowerCase())}`,
                            value: l,
                        };
                    }),
                });
                op = data.selected;
            }
            else {
                op = opsResponse.data[0];
            }
            self.log('\n 🗑  Removing from registry...');
            const { id, name, description } = op;
            await this.api
                .remove('ops', id, { headers: { Authorization: this.accessToken } })
                .catch(err => {
                throw new Error(err);
            });
            self.log(`\n ⚡️ ${sdk_1.ux.colors.bold(`${name}:${id}`)} has been ${sdk_1.ux.colors.green('removed')} from the registry!`);
            self.log(`\n To publish again run: ${sdk_1.ux.colors.green('$')} ${sdk_1.ux.colors.dim('ops publish <path>')}\n`);
            self.analytics.track({
                userId: self.user.email,
                event: 'Ops CLI Remove',
                properties: {
                    email: self.user.email,
                    username: self.user.username,
                    id,
                    name,
                    description,
                    image: `${env_1.OPS_REGISTRY_HOST}/${name}`,
                },
            });
        }
        catch (err) {
            this.debug(err);
            this.config.runHook('error', { err });
        }
    }
}
Remove.description = 'Remove an op from a team.';
Remove.args = [
    { name: 'opName', description: 'Name of the op you want to remove.' },
];
Remove.flags = {
    help: base_1.flags.help({ char: 'h' }),
};
exports.default = Remove;
