"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const sdk_1 = require("@cto.ai/sdk");
const fs = tslib_1.__importStar(require("fs-extra"));
const path = tslib_1.__importStar(require("path"));
const yaml = tslib_1.__importStar(require("yaml"));
const base_1 = tslib_1.__importStar(require("../base"));
const asyncPipe_1 = require("../utils/asyncPipe");
const customErrors_1 = require("../errors/customErrors");
const opConfig_1 = require("../constants/opConfig");
class Init extends base_1.default {
    constructor() {
        super(...arguments);
        this.questions = [];
        this.srcDir = path.resolve(__dirname, '../templates/');
        this.destDir = path.resolve(process.cwd());
        this.opName = '';
        this.opDescription = '';
        this.initPrompts = {
            template: {
                type: 'list',
                name: 'template',
                message: `\n What type of op would you like to create ${sdk_1.ux.colors.reset.green('→')}`,
                choices: [
                    { name: 'Local Op', value: opConfig_1.LOCAL },
                    { name: 'Container Op', value: opConfig_1.CONTAINER },
                ],
                afterMessage: `${sdk_1.ux.colors.reset.green('✓')}`,
            },
            name: {
                type: 'input',
                name: 'name',
                message: `\n Provide a name for your new op ${sdk_1.ux.colors.reset.green('→')}  \n🏷  ${sdk_1.ux.colors.white('Name:')}`,
                afterMessage: `${sdk_1.ux.colors.reset.green('✓')}`,
                afterMessageAppend: `${sdk_1.ux.colors.reset(' added!')}`,
                validate: this._validateName,
            },
            description: {
                type: 'input',
                name: 'description',
                message: `\nProvide a description ${sdk_1.ux.colors.reset.green('→')}  \n📝 ${sdk_1.ux.colors.white('Description:')}`,
                afterMessage: `${sdk_1.ux.colors.reset.green('✓')}`,
                afterMessageAppend: `${sdk_1.ux.colors.reset(' added!')}`,
                validate: this._validateDescription,
            },
        };
        this.determineQuestions = ({ prompts, flags, }) => {
            const removeIfPassedToFlags = ([key, _question]) => !Object.entries(flags)
                .map(([flagKey]) => flagKey)
                .includes(key);
            const questions = Object.entries(prompts)
                .filter(removeIfPassedToFlags)
                .map(([_key, question]) => question);
            return questions;
        };
        this.askQuestions = async (questions) => {
            return sdk_1.ux.prompt(questions);
        };
        this.determineInitPaths = (flags) => (answers) => {
            const initParams = Object.assign({}, flags, answers);
            const { template, name } = initParams;
            const templateDir = `${this.srcDir}/${template}`;
            const sharedDir = `${this.srcDir}/shared`;
            const destDir = `${this.destDir}/${name}`;
            const initPaths = { templateDir, sharedDir, destDir };
            return { initPaths, initParams };
        };
        this.copyTemplateFiles = async (input) => {
            try {
                const { destDir, templateDir, sharedDir } = input.initPaths;
                await fs.ensureDir(destDir);
                // copies select template files
                await fs.copy(templateDir, destDir);
                // copies shared files for both
                await fs.copy(sharedDir, destDir);
                return input;
            }
            catch (err) {
                throw new customErrors_1.CopyTemplateFilesError(err);
            }
        };
        this.customizePackageJson = async (input) => {
            try {
                const { destDir, sharedDir } = input.initPaths;
                const { name, description } = input.initParams;
                const packageObj = JSON.parse(fs.readFileSync(`${sharedDir}/package.json`, 'utf8'));
                packageObj.name = name;
                packageObj.description = description;
                const newPackageString = JSON.stringify(packageObj, null, 2);
                fs.writeFileSync(`${destDir}/package.json`, newPackageString);
                return input;
            }
            catch (err) {
                throw new customErrors_1.CouldNotInitializeOp(err);
            }
        };
        this.customizeOpsYaml = async (input) => {
            try {
                const { destDir } = input.initPaths;
                const { name, description, template } = input.initParams;
                const opsYamlObj = yaml.parse(fs.readFileSync(`${destDir}/ops.yml`, 'utf8'));
                if (template === opConfig_1.LOCAL) {
                    opsYamlObj.ops[0].name = name;
                    opsYamlObj.ops[0].description = description;
                }
                else {
                    opsYamlObj.name = name;
                    opsYamlObj.description = description;
                }
                const newOpsString = yaml.stringify(opsYamlObj);
                fs.writeFileSync(`${destDir}/ops.yml`, newOpsString);
                return input;
            }
            catch (err) {
                throw new customErrors_1.CouldNotInitializeOp(err);
            }
        };
        this.logMessages = async (input) => {
            const { destDir } = input.initPaths;
            const { name } = input.initParams;
            this.log('\n🎉 Success! Your op is ready to start coding... \n');
            fs.readdirSync(`${destDir}`).forEach((file) => {
                let callout = '';
                if (file.indexOf('index.js') > -1) {
                    callout = `${sdk_1.ux.colors.green('←')} ${sdk_1.ux.colors.white('Start developing here!')}`;
                }
                let msg = sdk_1.ux.colors.italic(`${path.relative(this.destDir, process.cwd())}/${name}/${file} ${callout}`);
                this.log(`📁 .${msg}`);
            });
            this.log(`\n🚀 Now test your op with: ${sdk_1.ux.colors.green('$')} ops run ${sdk_1.ux.colors.callOutCyan(name)}\n`);
            return input;
        };
        this.trackAnalytics = async (input) => {
            try {
                const { destDir } = input.initPaths;
                const { name, description, template } = input.initParams;
                this.analytics.track({
                    userId: this.user.email,
                    event: 'Ops CLI Init',
                    properties: {
                        email: this.user.email,
                        username: this.user.username,
                        path: destDir,
                        name,
                        description,
                        template,
                    },
                });
            }
            catch (err) {
                throw new customErrors_1.AnalyticsError(err);
            }
        };
    }
    _validateName(input) {
        if (input === '')
            return 'You need name your op before you can continue';
        if (!input.match('^[a-z0-9_-]*$')) {
            return 'Sorry, please name the Op using only numbers, letters, -, or _';
        }
        return true;
    }
    _validateDescription(input) {
        if (input === '')
            return 'You need to provide a description of your op before continuing';
        return true;
    }
    async run() {
        try {
            const { flags } = this.parse(Init);
            this.isLoggedIn();
            const initPipeline = asyncPipe_1.asyncPipe(this.determineQuestions, this.askQuestions, this.determineInitPaths(flags), this.copyTemplateFiles, this.customizePackageJson, this.customizeOpsYaml, this.logMessages, this.trackAnalytics);
            await initPipeline({ prompts: this.initPrompts, flags });
        }
        catch (err) {
            this.debug(err);
            this.config.runHook('error', { err });
        }
    }
}
Init.description = 'Easily create a new op.';
Init.flags = {
    help: base_1.flags.help({ char: 'h' }),
    name: base_1.flags.string({ char: 'n', description: 'Name of the op.' }),
    description: base_1.flags.string({
        char: 'd',
        description: 'Description of the op.',
    }),
};
exports.default = Init;
