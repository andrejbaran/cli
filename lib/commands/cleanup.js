"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const base_1 = tslib_1.__importStar(require("../base"));
const customErrors_1 = require("../errors/customErrors");
const env_1 = require("../constants/env");
// get ops matching the provided name
exports.getOps = async (opName, teamId, accessToken, api) => {
    return api.find('ops', {
        query: {
            name: opName,
            team_id: teamId,
        },
        headers: {
            Authorization: accessToken,
        },
    });
};
// form docker image name given the name/id and team name
exports.formImageName = (nameOrId, teamName, registryHost) => {
    return `${registryHost}/${teamName}/${nameOrId}`;
};
// remove the docker images
exports.removeImage = async (docker, imageName) => {
    await docker
        .getImage(imageName)
        .remove()
        .catch(err => {
        throw new customErrors_1.ImageNotFoundError();
    });
};
class Cleanup extends base_1.default {
    async run() {
        try {
            const { args: { opName }, } = this.parse(Cleanup);
            this.isLoggedIn();
            if (!this.docker)
                return;
            if (opName === 'all' || !opName) {
                // prune all unused images
                await this.docker.pruneImages();
                this.log(`\n Successfully removed unused images`);
                process.exit();
            }
            const ops = await exports.getOps(opName, this.team.id, this.accessToken, this.api).catch(() => {
                throw new Error('API error');
            });
            if (!ops.data) {
                throw new customErrors_1.ImageNotFoundError();
            }
            // remove both the images for the matching op name
            const { id, name } = ops.data[0];
            const imagebyId = exports.formImageName(id, this.team.name, env_1.OPS_REGISTRY_HOST);
            const imagebyName = exports.formImageName(name, this.team.name, env_1.OPS_REGISTRY_HOST);
            await exports.removeImage(this.docker, imagebyId);
            await exports.removeImage(this.docker, imagebyName);
            this.log(`\n Successfully removed images for ${opName}`);
        }
        catch (err) {
            this.debug(err);
            this.config.runHook('error', { err });
        }
    }
}
Cleanup.description = 'Clean up locally cached docker images.';
Cleanup.flags = {
    help: base_1.flags.help({ char: 'h' }),
};
Cleanup.args = [
    {
        name: 'opName',
        description: 'Name of the op to be cleaned up',
    },
];
exports.Cleanup = Cleanup;
