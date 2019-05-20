"use strict";
/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Tuesday, 30th April 2019 12:07:49 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Wednesday, 8th May 2019 7:33:53 pm
 * @copyright (c) 2019 CTO.ai
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const cloneDeep_1 = tslib_1.__importDefault(require("lodash/cloneDeep"));
const base_1 = tslib_1.__importStar(require("../../base"));
const env_1 = require("../../constants/env");
const asyncPipe_1 = require("../../utils/asyncPipe");
const customErrors_1 = require("../../errors/customErrors");
exports.signinPrompts = {
    email: {
        type: 'input',
        name: 'email',
        message: 'Enter email: ',
    },
    password: {
        type: 'password',
        name: 'password',
        message: 'Enter password: ',
        mask: '*',
    },
};
class AccountSignin extends base_1.default {
    constructor() {
        super(...arguments);
        this.sendAnalytics = (config) => {
            // This is wrapped in an if statement because it takes a while to finish executing.
            // The `nock` code that is supposed to intercept this call and counter it is not equipped
            // to handle this
            try {
                if (env_1.NODE_ENV === 'production') {
                    this.analytics.identify({
                        userId: config.user.email,
                        traits: {
                            beta: true,
                            email: config.user.email,
                            username: config.user.username,
                        },
                    });
                }
                this.analytics.track({
                    userId: config.user.email,
                    event: 'Ops CLI Signin',
                    properties: {
                        email: config.user.email,
                        username: config.user.username,
                    },
                });
            }
            catch (err) {
                throw new customErrors_1.AnalyticsError(err);
            }
            return cloneDeep_1.default(config);
        };
        this.showWelcomeMessage = (config) => {
            this.ux.spinner.stop(`${this.ux.colors.green('Done!')}`);
            this.log(`\n👋 ${this.ux.colors.white('Welcome back')} ${this.ux.colors.italic.dim(config.user.username)}!`);
            this.log(`\n👉 Type ${this.ux.colors.italic.dim('ops search')} to find ops or ${this.ux.colors.italic.dim('ops init')} to create your own! \n`);
            return cloneDeep_1.default(config);
        };
        this.signin = async (credentials) => {
            this.log('');
            this.ux.spinner.start(`${this.ux.colors.white('Authenticating')}`);
            return this.signinFlow(credentials);
        };
        this.determineQuestions = (prompts) => (flags) => {
            const removeIfPassedToFlags = ([key, _question]) => !Object.entries(flags)
                .map(([flagKey]) => flagKey)
                .includes(key);
            const questions = Object.entries(prompts)
                .filter(removeIfPassedToFlags)
                .map(([_key, question]) => question);
            return questions;
        };
        this.askQuestions = async (questions) => {
            if (!questions.length) {
                return {};
            }
            this.log(`${this.ux.colors.white('Please login to get started.')}\n`);
            return this.ux.prompt(questions);
        };
        this.determineUserCredentials = (flags) => (answers) => (Object.assign({}, flags, answers));
        this.logMessages = (input) => {
            this.log('');
            this.log(`💻 ${this.ux.colors.multiBlue('CTO.ai Ops')} - ${this.ux.colors.actionBlue('The CLI built for Teams')} 🚀`);
            this.log('');
            this.log(`👋 ${this.ux.colors.white('Welcome to the')} ${this.ux.colors.callOutCyan('Ops CLI beta')}! \n`);
            return Object.assign({}, input);
        };
    }
    async run() {
        try {
            const { flags } = this.parse(AccountSignin);
            const signinPipeline = asyncPipe_1.asyncPipe(this.logMessages, this.determineQuestions(exports.signinPrompts), this.askQuestions, this.determineUserCredentials(flags), this.signin, this.showWelcomeMessage, this.sendAnalytics);
            await signinPipeline(flags);
        }
        catch (err) {
            this.debug(err);
            this.config.runHook('error', { err });
        }
    }
}
AccountSignin.description = 'Logs in to your account.';
AccountSignin.flags = {
    help: base_1.flags.help({ char: 'h' }),
    email: base_1.flags.string({ char: 'e', description: 'Email' }),
    password: base_1.flags.string({ char: 'p', description: 'Password' }),
};
exports.default = AccountSignin;
