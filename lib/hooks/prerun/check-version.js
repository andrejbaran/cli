"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const sdk_1 = require("@cto.ai/sdk");
const get_latest_version_1 = tslib_1.__importDefault(require("../../utils/get-latest-version"));
const env_1 = require("../../constants/env");
const hook = async function (opts) {
    if (env_1.DEBUG) {
        return;
    }
    try {
        if (opts.Command.id === 'update')
            return;
        const latest = await get_latest_version_1.default();
        if (latest !== this.config.version) {
            this.log(sdk_1.ux.colors.white(`⚠️  ${sdk_1.ux.colors.actionBlue('UPDATE AVAILABLE')} - The latest version of ${sdk_1.ux.colors.callOutCyan(`CTO.ai Ops CLI is ${latest}`)}.\nTo update to the latest version please run '${sdk_1.ux.colors.callOutCyan('ops update')}'\n`));
        }
    }
    catch (err) {
        await this.config.runHook('error', { err });
    }
};
exports.default = hook;
