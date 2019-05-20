"use strict";
/**
 * @author: Brett Campbell (brett@hackcapital.com)
 * @date: Friday, 5th April 2019 12:06:07 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Friday, 3rd May 2019 12:02:37 pm
 * @copyright (c) 2019 CTO.ai
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const sdk_1 = require("@cto.ai/sdk");
const through = tslib_1.__importStar(require("through2"));
const json = tslib_1.__importStar(require("JSONStream"));
const get_docker_1 = tslib_1.__importDefault(require("../utils/get-docker"));
const customErrors_1 = require("../errors/customErrors");
async function publish(options) {
    const { op, registryAuth: { authconfig, projectFullName }, } = options;
    const imageUniqueId = `${projectFullName}/${op.id.toLowerCase()}`;
    // reg.local.hc.ai/jplew/ae2f60b1-4edd-4660-a087-7b530869df0f
    const imageName = `${projectFullName}/${op.name}`;
    // reg.local.hc.ai/jplew/banana
    const self = this;
    const docker = await get_docker_1.default(self, 'publish');
    try {
        if (!docker) {
            throw new Error('Could not initialize Docker.');
        }
        // getImage always returns an image. Must listImages
        const image = docker.getImage(imageName);
        if (!image) {
            throw new customErrors_1.DockerPublishNoImageFound(op.name);
        }
        this.log(`🔋 Creating release ${sdk_1.ux.colors.callOutCyan(imageUniqueId)}... \n`);
        const all = [];
        const log = this.log;
        const error = this.error;
        let size = 0;
        let parser = through.obj(function (chunk, _enc, cb) {
            this.push(chunk.status);
            if (chunk.aux) {
                log(`\n🚀 ${sdk_1.ux.colors.white('Publishing...')}\n`);
                log(`${sdk_1.ux.colors.green('>')} Tag: ${sdk_1.ux.colors.multiBlue(chunk.aux.Tag)}`);
                log(`${sdk_1.ux.colors.green('>')} Size: ${sdk_1.ux.colors.multiBlue(chunk.aux.Size)}`);
                log(`${sdk_1.ux.colors.green('>')} Digest: ${sdk_1.ux.colors.multiBlue(chunk.aux.Digest)}\n`);
                size = chunk.aux.Size;
            }
            else if (chunk.id) {
                log(`${chunk.status}: ${sdk_1.ux.colors.white(chunk.id)}`);
            }
            cb();
        });
        const _pipe = parser.pipe;
        parser.pipe = function (dest) {
            return _pipe(dest);
        };
        image.tag({ repo: imageUniqueId }, (err, _data) => {
            if (err)
                return error(err.message, { exist: 2 });
            const image = docker.getImage(imageUniqueId);
            image.push({
                tag: 'latest',
                authconfig,
            }, (err, stream) => {
                if (err)
                    return error(err.message, { exist: 2 });
                stream
                    .pipe(json.parse())
                    .pipe(parser)
                    .on('data', (d) => {
                    all.push(d);
                })
                    .on('end', async function () {
                    const bar = sdk_1.ux.progress.init();
                    bar.start(100, 0);
                    for (let i = 0; i < size; i++) {
                        bar.update(100 - size / i);
                        await sdk_1.ux.wait(5);
                    }
                    bar.update(100);
                    bar.stop();
                    log(`\n🙌 ${sdk_1.ux.colors.callOutCyan(imageUniqueId)} has been published! \n`);
                });
            });
        });
    }
    catch (err) {
        this.log(err.message);
        process.exit(1);
    }
}
exports.default = publish;
