"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const sdk_1 = require("@cto.ai/sdk");
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const base_1 = tslib_1.__importStar(require("../base"));
const get_latest_version_1 = tslib_1.__importDefault(require("../utils/get-latest-version"));
const customErrors_1 = require("../errors/customErrors");
let self;
class Update extends base_1.default {
    async run() {
        try {
            self = this;
            const latestVersion = await get_latest_version_1.default();
            await this._logUpdateMessage(latestVersion);
            await this._askQuestion();
            await this._updateVersion();
            this._trackAnalytics(latestVersion);
        }
        catch (err) {
            this.debug(err);
            this.config.runHook('error', { err });
        }
    }
    _logUpdateMessage(latestVersion) {
        self.log(`${sdk_1.ux.colors.white(`\n📦 ${sdk_1.ux.colors.actionBlue('INSTALL UPDATE?')} - You're about to update to ${sdk_1.ux.colors.callOutCyan(`CTO.ai Ops CLI ${latestVersion}`)} ${sdk_1.ux.colors.reset.green('→')}`)}`);
    }
    _trackAnalytics(newVersion) {
        this.analytics.track({
            userId: this.user.email,
            event: 'Ops CLI Update',
            properties: {
                oldVersion: this.config.version,
                newVersion,
            },
        });
    }
    async _askQuestion() {
        const { install } = await sdk_1.ux.prompt({
            type: 'confirm',
            name: 'install',
            message: `\n${sdk_1.ux.colors.white('Install update?')}`,
        });
        this.log('');
        if (!install) {
            this.log(`${sdk_1.ux.colors.errorRed('❌ Update cancelled')} ${sdk_1.ux.colors.white("- Let us know when you're ready for some sweet, sweet, updates.")}`);
            process.exit();
        }
    }
    async _updateVersion() {
        try {
            sdk_1.ux.spinner.start('Updating version');
            await exec('npm install -g @cto.ai/ops');
            sdk_1.ux.spinner.stop('Done!');
        }
        catch (err) {
            sdk_1.ux.spinner.stop('Failed');
            throw new customErrors_1.PermissionsError(err);
        }
    }
}
Update.description = 'Update the ops CLI.';
Update.flags = {
    help: base_1.flags.help({ char: 'h' }),
};
exports.default = Update;
