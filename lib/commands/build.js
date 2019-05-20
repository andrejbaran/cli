"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/**
 * Author: Brett Campbell (brett@hackcapital.com)
 * Date: Saturday, 6th April 2019 10:39:58 pm
 * Last Modified By: Brett Campbell (brett@hackcapital.com)
 * Last Modified Time: Saturday, 6th April 2019 10:40:00 pm
 *
 * DESCRIPTION
 *
 */
const path = tslib_1.__importStar(require("path"));
const base_1 = tslib_1.__importStar(require("../base"));
const sdk_1 = require("@cto.ai/sdk");
const fs = tslib_1.__importStar(require("fs-extra"));
const yaml = tslib_1.__importStar(require("yaml"));
const customErrors_1 = require("../errors/customErrors");
const getOpUrl_1 = require("../utils/getOpUrl");
const env_1 = require("../constants/env");
const opConfig_1 = require("../constants/opConfig");
const validate_1 = require("../utils/validate");
class Build extends base_1.default {
    async run() {
        try {
            const { args } = this.parse(Build);
            if (!args.path)
                throw new customErrors_1.MissingRequiredArgument('ops [command]');
            const opPath = args.path
                ? path.resolve(process.cwd(), args.path)
                : process.cwd();
            this.isLoggedIn();
            const manifest = await fs
                .readFile(path.join(opPath, opConfig_1.OP_FILE), 'utf8')
                .catch(err => {
                throw new customErrors_1.FileNotFoundError(err, opPath, opConfig_1.OP_FILE);
            });
            const op = manifest && yaml.parse(manifest);
            // await this.config.runHook('validate', op)
            if (!validate_1.isValidOpName(op))
                throw new customErrors_1.InvalidInputCharacter('Op Name');
            this.log(`🛠  ${sdk_1.ux.colors.white('Building:')} ${sdk_1.ux.colors.callOutCyan(opPath)}\n`);
            const opImageTag = getOpUrl_1.getOpImageTag(this.team.name, op.name);
            await this.config.runHook('build', {
                tag: getOpUrl_1.getOpUrl(env_1.OPS_REGISTRY_HOST, opImageTag),
                opPath,
                op,
            });
            this.analytics.track({
                userId: this.user.email,
                event: 'Ops CLI Build',
                properties: {
                    email: this.user.email,
                    username: this.user.username,
                    name: op.name,
                    description: op.description,
                    image: `${env_1.OPS_REGISTRY_HOST}/${op.name}`,
                },
            });
        }
        catch (err) {
            this.debug(err);
            this.config.runHook('error', { err });
        }
    }
}
Build.description = 'Build your op for sharing.';
Build.flags = {
    help: base_1.flags.help({ char: 'h' }),
};
Build.args = [
    { name: 'path', description: 'Path to the op you want to build.' },
];
exports.default = Build;
