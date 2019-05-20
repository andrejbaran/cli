"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const base_1 = tslib_1.__importStar(require("../../base"));
const sdk_1 = require("@cto.ai/sdk");
const env_1 = require("../../constants/env");
class AccountSupport extends base_1.default {
    async run() {
        this.log('');
        this.log('❔ Please reach out to us with questions anytime!');
        this.log(`⌚️ We are typically available ${sdk_1.ux.colors.white('Monday-Friday 9am-5pm PT')}.`);
        this.log(`📬 You can always reach us by ${this.ux.url('email', `mailto:${env_1.INTERCOM_EMAIL}`)} ${this.ux.colors.dim(`(${env_1.INTERCOM_EMAIL})`)}.\n`);
        this.log("🖖 We'll get back to you as soon as we possibly can.");
        this.log('');
        this.analytics.track({
            userId: this.user.email,
            event: 'Ops CLI Support',
            properties: {},
        });
    }
}
AccountSupport.description = 'Contact our support team with questions.';
AccountSupport.flags = {
    help: base_1.flags.help({ char: 'h' }),
};
exports.default = AccountSupport;
