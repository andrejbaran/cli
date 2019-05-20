"use strict";
/**
 * @author: Brett Campbell (brett@hackcapital.com)
 * @date: Saturday, 6th April 2019 10:39:58 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Thursday, 16th May 2019 4:54:26 pm
 * @copyright (c) 2019 CTO.ai
 *
 * DESCRIPTION
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const sdk_1 = require("@cto.ai/sdk");
const fs = tslib_1.__importStar(require("fs-extra"));
const json = tslib_1.__importStar(require("JSONStream"));
const path = tslib_1.__importStar(require("path"));
const through = tslib_1.__importStar(require("through2"));
const yaml = tslib_1.__importStar(require("yaml"));
const child_process_1 = require("child_process");
const base_1 = tslib_1.__importStar(require("../base"));
const env_1 = require("../constants/env");
const customErrors_1 = require("../errors/customErrors");
const opConfig_1 = require("../constants/opConfig");
const utils_1 = require("../utils");
class Run extends base_1.default {
    constructor() {
        super(...arguments);
        this.container = undefined;
        this.prompts = {
            agreeToMountHome: {
                type: 'confirm',
                name: 'agreeToMountHome',
                message: 'Note: This container will mount your home directory as a read-only file system. Continue?',
            },
            ignoreMountWarnings: {
                type: 'confirm',
                name: 'ignoreMountWarnings',
                message: 'Would you like to skip this confirmation step from now on?',
            },
        };
        this.useCustomParser = (options, argv) => {
            const { args, flags } = require('@oclif/parser').parse(argv, Object.assign({}, options, { context: this }));
            if (!args.nameOrPath && !flags.help) {
                throw new Error('Please enter the name or path of the op');
            }
            if (!args.nameOrPath)
                this._help();
            return { args, flags, opParams: argv.slice(1) };
        };
        this.getOpFromFs = async (manifestPath, opParams, { team }) => {
            const manifestYML = await fs.readFile(manifestPath, 'utf8');
            const manifestObj = yaml.parse(manifestYML);
            // This allows any flags aside from -h to be passed into the op's run command
            const image = path.join(env_1.OPS_REGISTRY_HOST, `${team.name}/${manifestObj.name}`);
            return { op: Object.assign({}, manifestObj, { image }), isPublished: false };
        };
        this.getOpFromAPI = async (opNameOrPath, config) => {
            const [opName] = opNameOrPath.split(':');
            const headers = {
                Authorization: config.accessToken,
            };
            const query = {
                team_id: config.team.id,
                search: opName,
            };
            try {
                const { data } = await this.api.find('ops', {
                    query,
                    headers,
                });
                if (data && !data.length) {
                    throw new Error('‼️  No op was found with this name or ID. Please try again.');
                }
                return { op: data[0], isPublished: true };
            }
            catch (err) {
                throw new Error(err);
            }
        };
        this.printCustomHelp = (op) => {
            if (!op.help)
                throw new Error('Custom help message can be defined in the ops.yml\n');
            switch (true) {
                case !!op.description:
                    this.log(`\n${op.description}`);
                case !!op.help.usage:
                    this.log(`\n${sdk_1.ux.colors.bold('USAGE')}`);
                    this.log(`  ${op.help.usage}`);
                case !!op.help.arguments:
                    this.log(`\n${sdk_1.ux.colors.bold('ARGUMENTS')}`);
                    Object.keys(op.help.arguments).forEach(a => {
                        this.log(`  ${a} ${sdk_1.ux.colors.dim(op.help.arguments[a])}`);
                    });
                case !!op.help.options:
                    this.log(`\n${sdk_1.ux.colors.bold('OPTIONS')}`);
                    Object.keys(op.help.options).forEach(o => {
                        this.log(`  -${o.substring(0, 1)}, --${o} ${sdk_1.ux.colors.dim(op.help.options[o])}`);
                    });
            }
        };
        this.getOpConfig = async (_a) => {
            var { parsedArgs, config } = _a, rest = tslib_1.__rest(_a, ["parsedArgs", "config"]);
            const { args: { nameOrPath }, opParams, flags: { help }, } = parsedArgs;
            const dirPath = path.resolve(process.cwd(), `${nameOrPath}`);
            const manifestPath = path.join(dirPath, opConfig_1.OP_FILE);
            const { op, isPublished } = fs.existsSync(manifestPath)
                ? await this.getOpFromFs(manifestPath, opParams, config)
                : await this.getOpFromAPI(nameOrPath, config);
            if (!op || !op.name)
                throw new Error('Unable to find Op');
            op.run = [op.run, ...opParams].join(' ');
            if (help) {
                this.printCustomHelp(op);
                process.exit();
            }
            return Object.assign({}, rest, { op, isPublished, parsedArgs, config });
        };
        this.imageFilterPredicate = (repo) => ({ RepoTags }) => RepoTags.find((repoTag) => repoTag.includes(repo));
        this.findLocalImage = async ({ id, name }, { team }) => {
            if (!this.docker)
                throw new Error('No docker container');
            const list = await this.docker.listImages();
            const repo = `${env_1.OPS_REGISTRY_HOST}/${team.name}/${id || name}:latest`;
            const localImage = list
                .map(this.imageFilterPredicate(repo))
                .find((repoTag) => !!repoTag);
            return localImage;
        };
        this.buildImage = async (op, nameOrPath) => {
            const opPath = path.resolve(process.cwd(), nameOrPath);
            const tag = `${op.image}:latest`;
            await this.config.runHook('build', { tag, opPath, op });
        };
        this.getAuthConfig = async (accessToken) => {
            const registryAuth = await this.getRegistryAuth(accessToken);
            if (!registryAuth || !registryAuth.authconfig) {
                throw new customErrors_1.CouldNotGetRegistryToken();
            }
            return registryAuth;
        };
        this.updateStatusBar = (stream, { parser, bar }) => async (resolve, reject) => {
            const allData = [];
            const size = 100;
            stream
                .pipe(json.parse())
                .pipe(parser)
                .on('data', data => allData.push(data))
                .on('end', async (err) => {
                for (let i = 0; i < size; i++) {
                    bar.update(100 - size / i);
                    await sdk_1.ux.wait(5);
                }
                bar.update(100);
                bar.stop();
                return err ? reject(err) : resolve(allData);
            });
        };
        this.getProgressBarText = (status, { name }) => {
            const mapping = {
                [`Pulling from ${name}`]: `✅ Pulling from ${name}...`,
                'Already exists': '✅ Already exists!',
                Waiting: '⏱  Waiting...',
                Downloading: '👇 Downloading...',
                'Download complete': '👇 Downloaded!',
                Extracting: '📦 Unpacking...',
                'Pulling fs layer': '🐑 Pulling layers...',
                'Pull complete': '🎉 Pull Complete!',
            };
            return { speed: mapping[status] };
        };
        this.setParser = (op, getFn) => {
            const bar = sdk_1.ux.progress.init({
                format: sdk_1.ux.colors.callOutCyan('{bar} {percentage}% | Status: {speed} '),
                barCompleteChar: '\u2588',
                barIncompleteChar: '\u2591',
            });
            bar.start(100, 0, { speed: '🏁 Starting...' });
            const layers = {};
            const parser = through.obj((chunk, _enc, callback) => {
                const { id, status, progressDetail: p } = chunk;
                const progress = p && p.current ? (p.current / p.total) * 100 : 0;
                const { speed } = getFn(status, op);
                if (id)
                    layers[id] = id;
                if (speed)
                    bar.update(progress, { speed });
                callback();
            });
            const _pipe = parser.pipe;
            parser.pipe = dest => _pipe(dest);
            return { parser, bar };
        };
        this.pullImageFromRegistry = async (op, isPublished) => {
            this.log(`🔋 Pulling ${sdk_1.ux.colors.dim(op.name)} from registry...\n`);
            const { config } = this.state;
            if (!this.docker)
                throw new Error('No docker');
            try {
                const opUrl = this.setOpUrl(op, config, isPublished);
                const { authconfig } = await this.getAuthConfig(config.accessToken);
                const stream = await this.docker.pull(opUrl, { authconfig });
                if (!stream)
                    throw new Error('No stream');
                const parser = await this.setParser(op, this.getProgressBarText);
                await new Promise(this.updateStatusBar(stream, parser));
                sdk_1.ux.spinner.stop(sdk_1.ux.colors.green('Done!'));
                const msg = `${sdk_1.ux.colors.italic.bold(`${op.name}:${op.id}`)}`;
                this.log(`\n🙌 Saved ${msg} locally! \n`);
                return opUrl;
            }
            catch (err) {
                throw new Error(err);
            }
        };
        this.getImage = async ({ op, config, parsedArgs, isPublished }) => {
            try {
                const { args: { nameOrPath }, flags: { build }, } = parsedArgs;
                const localImage = await this.findLocalImage(op, config);
                if (!localImage || build) {
                    const opUrl = isPublished
                        ? await this.pullImageFromRegistry(op, isPublished)
                        : await this.buildImage(op, nameOrPath);
                    return { op: Object.assign({}, op, { image: opUrl }), config };
                }
                return { op: Object.assign({}, op, { image: localImage }), config };
            }
            catch (err) {
                throw new Error('Unable to find image for this op');
            }
        };
        this.convertEnvStringsToObject = (acc, curr) => {
            const [key, val] = curr.split('=');
            if (!val) {
                return Object.assign({}, acc);
            }
            return Object.assign({}, acc, { [key]: val });
        };
        this.overrideEnvWithProcessEnv = (processEnv) => ([key, val,]) => [key, processEnv[key] || val];
        this.concatenateKeyValToString = ([key, val]) => `${key}=${val}`;
        this.setEnvs = (processEnv) => (_a) => {
            var { op, config } = _a, rest = tslib_1.__rest(_a, ["op", "config"]);
            const defaultEnv = {
                NODE_ENV: 'production',
                LOGGER_PLUGINS_STDOUT_ENABLED: 'true',
                OPS_ACCESS_TOKEN: config.accessToken,
                OPS_API_PATH: env_1.OPS_API_PATH,
                OPS_API_HOST: env_1.OPS_API_HOST,
            };
            const opsYamlEnv = op.env
                ? op.env.reduce(this.convertEnvStringsToObject, {})
                : [];
            const env = Object.entries(Object.assign({}, defaultEnv, opsYamlEnv))
                .map(this.overrideEnvWithProcessEnv(processEnv))
                .map(this.concatenateKeyValToString);
            return Object.assign({}, rest, { config, op: Object.assign({}, op, { env }) });
        };
        this.replaceHomeAlias = (bindPair) => {
            const [first, ...rest] = bindPair.split(':');
            const from = first.replace('~', env_1.HOME).replace('$HOME', env_1.HOME);
            const to = rest.join('');
            return `${from}:${to}`;
        };
        this.setBinds = (_a) => {
            var { op } = _a, rest = tslib_1.__rest(_a, ["op"]);
            return Object.assign({}, rest, { op: Object.assign({}, op, { bind: op.bind ? op.bind.map(this.replaceHomeAlias) : [] }) });
        };
        this.setOpUrl = (op, { team }, isPublished) => {
            const opIdentifier = isPublished ? op.id : op.name;
            const opImageTag = utils_1.getOpImageTag(team.name, opIdentifier);
            return utils_1.getOpUrl(env_1.OPS_REGISTRY_HOST, opImageTag);
        };
        this.getOptions = (_a) => {
            var { op, config, isPublished } = _a, rest = tslib_1.__rest(_a, ["op", "config", "isPublished"]);
            const Image = op.image || this.setOpUrl(op, config, isPublished);
            const WorkingDir = op.mountCwd ? '/cwd' : '/ops';
            const Cmd = op.run ? op.run.split(' ') : [];
            if (op.mountCwd) {
                const bindFrom = process.cwd();
                const bindTo = '/cwd';
                const cwDir = `${bindFrom}:${bindTo}`;
                op.bind.push(cwDir);
            }
            if (op.mountHome) {
                const homeDir = `${env_1.HOME}:/root:ro`;
                op.bind.push(homeDir);
            }
            const options = {
                AttachStderr: true,
                AttachStdin: true,
                AttachStdout: true,
                Cmd,
                Env: op.env,
                WorkingDir,
                HostConfig: {
                    Binds: op.bind,
                    NetworkMode: op.network,
                },
                Image,
                OpenStdin: true,
                StdinOnce: false,
                Tty: true,
                Volumes: {},
                VolumesFrom: [],
            };
            return Object.assign({}, rest, { op, options });
        };
        this.createDockerContainer = async (_a) => {
            var { op, options } = _a, rest = tslib_1.__rest(_a, ["op", "options"]);
            if (!this.docker)
                throw new Error('No docker');
            this.log(`⚙️  Running ${sdk_1.ux.colors.dim(op.name)}...`);
            try {
                const container = await this.docker.createContainer(options);
                this.container = container;
                return Object.assign({}, rest, { op, options });
            }
            catch (err) {
                throw new Error('Error creating Docker container');
            }
        };
        this.attachToContainer = async (state) => {
            if (!this.container)
                throw new Error('No docker container for attachment');
            try {
                const options = {
                    stream: true,
                    stdin: true,
                    stdout: true,
                    stderr: true,
                };
                const stream = await this.container.attach(options);
                this.handleStream(stream);
                await this.startDockerContainer(stream);
                return state;
            }
            catch (err) {
                throw new Error(err);
            }
        };
        this.resize = () => {
            if (!this.container)
                throw new Error('No docker container for resize');
            try {
                const dimensions = {
                    h: process.stdout.rows,
                    w: process.stderr.columns,
                };
                if (dimensions.h !== 0 && dimensions.w !== 0) {
                    this.container.resize(dimensions, () => { });
                }
            }
            catch (err) {
                throw new Error(err);
            }
        };
        this.handleExit = (stream, isRaw) => {
            if (!this.container)
                throw new Error('No docker container for removal');
            const stdout = process.stdout;
            const stdin = process.stdin;
            try {
                stdout.removeListener('resize', this.resize);
                stdin.removeAllListeners();
                stdin.setRawMode && stdin.setRawMode(isRaw);
                stdin.resume();
                stream.end();
                this.container.remove(() => process.exit());
            }
            catch (err) {
                throw new Error(err);
            }
        };
        this.handleStream = (stream) => {
            const CTRL_P = '\u0010';
            const CTRL_Q = '\u0011';
            let previousKey = '';
            stream.pipe(process.stdout);
            const stdin = process.stdin;
            stdin.resume();
            stdin.setEncoding('utf8');
            stdin.setRawMode && stdin.setRawMode(true);
            stdin.pipe(stream);
            stdin.on('data', (key) => {
                // Detects it is detaching a running container
                if (previousKey === CTRL_P && key === CTRL_Q)
                    this.handleExit(stream, false);
                previousKey = key;
            });
        };
        this.startDockerContainer = async (stream) => {
            if (!this.container)
                throw new Error('No docker container to start up');
            try {
                await this.container.start();
                this.resize();
                process.stdout.on('resize', this.resize);
                await this.container.wait();
                this.handleExit(stream, false);
            }
            catch (err) {
                throw new Error(err);
            }
        };
        this.sendAnalytics = ({ op }) => {
            this.analytics.track({
                userId: this.user.email,
                event: 'Ops CLI Run',
                properties: {
                    email: this.user.email,
                    username: this.user.username,
                    name: op.name,
                    description: op.description,
                    image: `${op.image}`,
                },
            });
        };
        this._promptForHomeDirectory = async (mountHome, { ignoreMountWarnings }) => {
            if (mountHome && !ignoreMountWarnings) {
                return this.ux.prompt(this.prompts.agreeToMountHome);
            }
            return { agreeToMountHome: ignoreMountWarnings };
        };
        this._promptToIgnoreWarning = async (mountHome, { ignoreMountWarnings }) => {
            /*
             * Prompt user only if ignore flag is undefined. If it is set to true or false,
             * the user has made up their mind. They should be asked this question only
             * once, not every time they run. *
             */
            if (mountHome && typeof ignoreMountWarnings === 'undefined') {
                return this.ux.prompt(this.prompts.ignoreMountWarnings);
            }
            return { ignoreMountWarnings };
        };
        this._doBindMountChecks = async (mountHome, config) => {
            if (!mountHome || config.ignoreMountWarnings) {
                return;
            }
            const { agreeToMountHome } = await this._promptForHomeDirectory(mountHome, config);
            // TO-DO: replace with link to actual docs
            if (!agreeToMountHome) {
                this.log("\nAborting op execution. If you'd like to read more about our bind-mounting feature, please visit our docs: https://cto.ai/blog/\n");
                process.exit();
            }
            const { ignoreMountWarnings } = await this._promptToIgnoreWarning(mountHome, config);
            const isIgnoreFlagUndefined = typeof config.ignoreMountWarnings === 'undefined';
            if (isIgnoreFlagUndefined) {
                this.writeConfig(config, {
                    ignoreMountWarnings,
                });
            }
        };
        this._runLocalOp = (options) => this._runLocalOpHof(options);
        this._runLocalOpHof = (options) => (commandInfo) => async ({ errors, args, }) => {
            const { hookType, command } = commandInfo;
            this.printMessage(`🏃  Running ${hookType}:`, command);
            const params = args && hookType === 'main command' ? args : [];
            const childProcess = child_process_1.spawn(command, params, options);
            const exitResponse = await utils_1.onExit(childProcess);
            if (exitResponse) {
                this.printErrorMessage(exitResponse);
            }
            const newErrors = exitResponse
                ? [...errors, { exitResponse, commandInfo }]
                : [...errors];
            return { errors: newErrors, args };
        };
        this.labelTheCommand = (hookType) => (command) => ({
            hookType,
            command,
        });
        this.createArrayOfAllLocalCommands = ({ before, run, after }, options) => {
            const beforeCommands = before
                ? before.map(this.labelTheCommand('before-hook'))
                : [];
            const runCommand = [run].map(this.labelTheCommand('main command'));
            const afterCommands = after
                ? after.map(this.labelTheCommand('after-hook'))
                : [];
            const flattenedCommands = [
                ...beforeCommands,
                ...runCommand,
                ...afterCommands,
            ];
            return flattenedCommands.map(this.convertCommandToSpawnFunction(options));
        };
        this.convertCommandToSpawnFunction = (options) => (commandInfo) => this._runLocalOp(options)(commandInfo);
    }
    async findLocalOp(manifestPath, nameOrPath) {
        const manifest = await fs.readFile(manifestPath, 'utf8');
        const { ops } = yaml.parse(manifest);
        if (!ops)
            return;
        return ops.find(({ name }) => name === nameOrPath);
    }
    printMessage(bold, normal = '') {
        this.log(`\n ${this.ux.colors.bold(bold)} ${normal}\n`);
    }
    printErrorMessage({ code, signal }) {
        this.log(this.ux.colors.redBright(`Exit with error code ${this.ux.colors.whiteBright(code)} and signal ${this.ux.colors.whiteBright(signal)}`));
    }
    async runLocalOps(localOp, parsedArgs) {
        const { name } = localOp;
        const options = {
            stdio: 'inherit',
            shell: true,
            env: process.env,
        };
        const localOps = this.createArrayOfAllLocalCommands(localOp, options);
        const errors = [];
        const localOpPipeline = utils_1.asyncPipe(...localOps);
        const finalOutput = await localOpPipeline({
            errors,
            args: parsedArgs.opParams,
        });
        const { errors: finalErrors } = finalOutput;
        finalErrors.forEach((error, i) => {
            if (i === 0) {
                this.log(`\n❗️  Local op ${this.ux.colors.callOutCyan(name)} failed.`);
                this.log(this.ux.colors.redBright(`🤔  There was a problem with the ${this.ux.colors.whiteBright(error.commandInfo.command)} command in the ${this.ux.colors.whiteBright(error.commandInfo.hookType)}.\n`));
                // additional error logging, probably not necessary
                // if (error.exitResponse) {
                //   this.printErrorMessage(error.exitResponse)
                // }
            }
        });
        !finalErrors.length &&
            this.printMessage(`😌  Local op ${this.ux.colors.callOutCyan(name)} completed successfully.`);
    }
    async getLocalOpIfExists({ args: { nameOrPath } }) {
        const localManifest = path.join(process.cwd(), opConfig_1.OP_FILE);
        const localManifestExists = fs.existsSync(localManifest);
        if (!localManifestExists) {
            return null;
        }
        const localOp = await this.findLocalOp(localManifest, nameOrPath);
        // if (localOp && !localOp.run) {
        //   throw new Error('ops.yml must specify a run command')
        // }
        return localOp;
    }
    async run() {
        try {
            this.isLoggedIn();
            const { config } = this.state;
            const parsedArgs = this.useCustomParser(Run, this.argv);
            const localOp = await this.getLocalOpIfExists(parsedArgs);
            if (localOp) {
                return await this.runLocalOps(localOp, parsedArgs);
            }
            const runPipeline = utils_1.asyncPipe(this.getOpConfig, this.getImage, this.setEnvs(process.env), this.setBinds, this.getOptions, this.createDockerContainer, this.attachToContainer, this.sendAnalytics);
            await runPipeline({
                parsedArgs,
                config,
                isPublished: false,
                options: undefined,
            });
        }
        catch (err) {
            this.debug(err);
            this.config.runHook('error', { err });
        }
    }
}
Run.description = 'Run an op from the registry.';
Run.flags = {
    help: base_1.flags.boolean({
        char: 'h',
        description: 'show CLI help',
    }),
    build: base_1.flags.boolean({
        char: 'b',
        description: 'Builds the op before running. Must provide a path to the op.',
        default: false,
    }),
};
// Used to specify variable length arguments
Run.strict = false;
Run.args = [
    {
        name: 'nameOrPath',
        description: 'Name or path of the op you want to run.',
    },
];
exports.default = Run;
