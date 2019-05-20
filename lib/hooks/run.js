"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const get_docker_1 = tslib_1.__importDefault(require("../utils/get-docker"));
const ops_registry_host = process.env.OPS_REGISTRY_HOST || 'registry.cto.ai';
async function run(options) {
    const { op } = options;
    const self = this;
    const docker = await get_docker_1.default(self, 'run');
    if (!docker) {
        throw new Error('Could not initialize Docker');
    }
    docker.getImage(`${ops_registry_host}/${op.name}`);
    console.log(`${ops_registry_host}/${op.name}`);
}
exports.default = run;
