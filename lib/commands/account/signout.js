"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const base_1 = tslib_1.__importStar(require("../../base"));
const sdk_1 = require("@cto.ai/sdk");
class AccountSignout extends base_1.default {
    async run() {
        try {
            if (!this.accessToken) {
                return this.log(`\n🤷‍♂️ You are already signed out. Type \'${sdk_1.ux.colors.actionBlue('ops account:signin')}\' to sign back into your account.`);
            }
            this.log('');
            sdk_1.ux.spinner.start(`${sdk_1.ux.colors.white('Signing out of ')}${sdk_1.ux.colors.actionBlue('CTO.ai ops')}`);
            await this.clearConfig(this);
            sdk_1.ux.spinner.stop(`${sdk_1.ux.colors.green('Done!')}`);
            this.log('');
            const { accessToken } = await this.readConfig();
            if (!accessToken) {
                this.log(`${sdk_1.ux.colors.green('✓')} Signed out! Type \'ops ${sdk_1.ux.colors.actionBlue('account:signin')}\' to sign back into your account.`);
            }
            this.analytics.track({
                userId: this.user.email,
                event: 'Ops CLI Signout',
                properties: {
                    email: this.user.email,
                    username: this.user.username,
                },
            });
        }
        catch (err) {
            this.debug(err);
            this.config.runHook('error', { err });
        }
    }
}
AccountSignout.description = 'Log out from your account.';
AccountSignout.flags = {
    help: base_1.flags.help({ char: 'h' }),
};
exports.default = AccountSignout;
