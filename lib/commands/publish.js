"use strict";
/**
 * @author: Brett Campbell (brett@hackcapital.com)
 * @date: Friday, 5th April 2019 12:06:07 pm
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Friday, 3rd May 2019 4:57:28 pm
 * @copyright (c) 2019 CTO.ai
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs = tslib_1.__importStar(require("fs-extra"));
const path = tslib_1.__importStar(require("path"));
const yaml = tslib_1.__importStar(require("yaml"));
const base_1 = tslib_1.__importStar(require("../base"));
const env_1 = require("../constants/env");
const opConfig_1 = require("../constants/opConfig");
const customErrors_1 = require("../errors/customErrors");
const validate_1 = require("../utils/validate");
class Publish extends base_1.default {
    async run() {
        try {
            const { args } = this.parse(Publish);
            if (!args.path)
                throw new customErrors_1.MissingRequiredArgument('ops publish');
            const opPath = args.path
                ? path.resolve(process.cwd(), args.path)
                : process.cwd();
            this.isLoggedIn();
            const manifest = await fs
                .readFile(path.join(opPath, opConfig_1.OP_FILE), 'utf8')
                .catch((err) => {
                throw new customErrors_1.FileNotFoundError(err, opPath, opConfig_1.OP_FILE);
            });
            const pkg = manifest && yaml.parse(manifest);
            // await this.config.runHook('validate', pkg)
            if (!validate_1.isValidOpName(pkg))
                throw new customErrors_1.InvalidInputCharacter('Op Name');
            // TODO: Handle removal of image from database if publish doesn't work
            let publishOpResponse = await this.api.create('ops', Object.assign({}, pkg, { teamID: this.team.id }), {
                headers: {
                    Authorization: this.accessToken,
                },
            });
            if (!publishOpResponse || !publishOpResponse.data) {
                throw new customErrors_1.CouldNotCreateOp(`There might be a duplicate key violation in the ops table. Also check that you are signed-in correctly. ${publishOpResponse.message}`);
            }
            const { data: op } = publishOpResponse;
            const registryAuth = await this.getRegistryAuth(this.accessToken);
            if (!registryAuth) {
                throw new Error('could not get registry auth');
            }
            await this.config.runHook('publish', {
                op,
                registryAuth,
            });
            this.analytics.track({
                userId: this.user.email,
                event: 'Ops CLI Publish',
                properties: {
                    email: this.user.email,
                    username: this.user.username,
                    name: op.name,
                    description: op.description,
                    image: `${env_1.OPS_REGISTRY_HOST}/${op.id.toLowerCase()}`,
                    tag: 'latest',
                },
            });
        }
        catch (err) {
            this.debug(err);
            this.config.runHook('error', { err });
        }
    }
}
Publish.description = 'Publish an op to a team.';
Publish.flags = {
    help: base_1.flags.help({ char: 'h' }),
};
Publish.args = [
    { name: 'path', description: 'Path to the op you want to publish.' },
];
exports.default = Publish;
