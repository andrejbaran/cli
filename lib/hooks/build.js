"use strict";
/**
 * @author: Brett Campbell (brett@hackcapital.com)
 * @date: Friday, 5th April 2019 12:06:07 pm
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Friday, 3rd May 2019 4:57:32 pm
 * @copyright (c) 2019 CTO.ai
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const sdk_1 = require("@cto.ai/sdk");
const through2_1 = tslib_1.__importDefault(require("through2"));
const JSONStream_1 = tslib_1.__importDefault(require("JSONStream"));
const get_docker_1 = tslib_1.__importDefault(require("../utils/get-docker"));
const customErrors_1 = require("../errors/customErrors");
async function build(options) {
    const { opPath, tag, op } = options;
    const all = [];
    const log = this.log;
    let parser = through2_1.default.obj(function (chunk, _enc, cb) {
        if (chunk.stream && chunk.stream !== '\n') {
            this.push(chunk.stream.replace('\n', ''));
            log(chunk.stream.replace('\n', ''));
            all.push(chunk);
        }
        else if (chunk.errorDetail) {
            throw new customErrors_1.ReadFileError(chunk.errorDetail.message);
        }
        cb();
    });
    const _pipe = parser.pipe;
    parser.pipe = function (dest) {
        return _pipe(dest);
    };
    await new Promise(async function (resolve, reject) {
        const self = this;
        const docker = await get_docker_1.default(self, 'build');
        if (docker) {
            const stream = await docker
                .buildImage({ context: opPath, src: op.src }, { t: tag })
                .catch(err => {
                throw new customErrors_1.DockerBuildImageError(err);
                reject();
                return null;
            });
            if (stream) {
                stream
                    .pipe(JSONStream_1.default.parse())
                    .pipe(parser)
                    .on('data', (d, data) => {
                    all.push(d);
                })
                    .on('end', async function () {
                    log('\n⚡️ Verifying...');
                    const bar = sdk_1.ux.progress.init();
                    bar.start(100, 0);
                    for (let i = 0; i < all.length; i++) {
                        bar.update(100 - all.length / i);
                        await sdk_1.ux.wait(50);
                    }
                    bar.update(100);
                    bar.stop();
                    log(`\n💻 Run ${sdk_1.ux.colors.green('$')} ${sdk_1.ux.colors.italic.dim('ops run ' + op.name)} to test your op.`);
                    log(`📦 Run ${sdk_1.ux.colors.green('$')} ${sdk_1.ux.colors.italic.dim('ops publish ' + opPath)} to share your op. \n`);
                    resolve();
                });
            }
        }
    });
}
exports.default = build;
