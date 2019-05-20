"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const sdk_1 = require("@cto.ai/sdk");
const base_1 = tslib_1.__importStar(require("../../base"));
const env_1 = require("../../constants/env");
const customErrors_1 = require("../../errors/customErrors");
const validate_1 = require("../../utils/validate");
const asyncPipe_1 = require("../../utils/asyncPipe");
class AccountSignup extends base_1.default {
    constructor() {
        super(...arguments);
        this._validateEmail = async (input) => {
            if (!validate_1.validateEmail(input))
                return '❗ The format of your email is invalid, please check that it is correct and try again.';
            const unique = await this.validateUniqueField({ email: input }).catch(err => {
                throw new customErrors_1.APIError(err);
            });
            if (!unique)
                return '❗ Email is already used with another account, please try again using another.';
            return true;
        };
        this._validateUsername = async (input) => {
            try {
                const unique = await this.validateUniqueField({ username: input });
                if (!unique)
                    return '😞 Username is already taken, please try using another.';
                return true;
            }
            catch (err) {
                throw new customErrors_1.APIError(err);
            }
        };
        this.questions = [
            {
                type: 'input',
                name: 'email',
                message: `\n📩 Please enter your email ${sdk_1.ux.colors.reset.green('→')}  \n${sdk_1.ux.colors.white('Enter Email')}`,
                afterMessage: `${sdk_1.ux.colors.reset.green('✓')} Email`,
                afterMessageAppend: `${sdk_1.ux.colors.reset(' added!')}`,
                validate: this._validateEmail.bind(this),
            },
            {
                type: 'input',
                name: 'username',
                message: `\n🖖 Create a username to get started ${sdk_1.ux.colors.reset.green('→')}  \n${sdk_1.ux.colors.white('Enter Username')}`,
                afterMessage: `${sdk_1.ux.colors.reset.green('✓')} Username`,
                afterMessageAppend: `${sdk_1.ux.colors.reset(' created!')}`,
                validate: this._validateUsername.bind(this),
            },
            {
                type: 'password',
                name: 'password',
                mask: '*',
                message: `\n🔑 Let's create a password next ${sdk_1.ux.colors.reset.green('→')}  \n${sdk_1.ux.colors.white('Enter your password')}`,
                afterMessage: `${sdk_1.ux.colors.reset.green('✓')} Password added!`,
                validate: validate_1.validatePasswordFormat,
            },
            {
                type: 'password',
                name: 'cpassword',
                mask: '*',
                message: '\n🔑 Confirm your password: ',
                afterMessage: `${sdk_1.ux.colors.reset.green('✓')} Password confirmed!`,
                validate: validate_1.validateCpassword,
            },
        ];
        this.logConfimationMessage = () => {
            sdk_1.ux.spinner.stop(`${sdk_1.ux.colors.green('Done!')}`);
            this.log(`\n✅ ${sdk_1.ux.colors.white('Your account is setup! You can now build, run and share ops!')}`);
            this.log(`🎉 ${sdk_1.ux.colors.white('We just sent you an email with tips on how to get started!')}\n`);
        };
        this.trackSignup = (config) => {
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
                    event: 'Ops CLI Signup',
                    properties: {
                        email: config.user.email,
                        username: config.user.username,
                        os: this.config.platform,
                        terminal: this.config.shell,
                    },
                });
            }
            catch (error) {
                throw new customErrors_1.AnalyticsError(error);
            }
        };
        this.createUser = async (input) => {
            await this.api
                .create('users', {
                email: input.email,
                password: input.password,
                username: input.username,
            })
                .catch(err => {
                throw new customErrors_1.SignUpError(err);
            });
            const { email, password } = input;
            return { email, password };
        };
        this.logCreatingAccount = (input) => {
            this.log('');
            sdk_1.ux.spinner.start(`${sdk_1.ux.colors.white('Creating account')}`);
            return Object.assign({}, input);
        };
        this.askQuestions = async (questions) => {
            if (!questions.length)
                return {};
            return this.ux.prompt(questions);
        };
        this.logHelpMessage = () => {
            this.log('');
            this.log(`💻 ${sdk_1.ux.colors.multiBlue('CTO.ai Ops')} - ${sdk_1.ux.colors.actionBlue('The CLI built for Teams')} 🚀`);
            this.log('');
            this.log(`👋 ${sdk_1.ux.colors.white('Welcome to the')} ${sdk_1.ux.colors.callOutCyan('Ops CLI beta')}! \n`);
            this.log('❔ Let us know if you have questions...');
            this.log(`📬 You can always reach us by ${this.ux.url('email', `mailto:${env_1.INTERCOM_EMAIL}`)} ${this.ux.colors.dim(`(${env_1.INTERCOM_EMAIL})`)}.\n`);
            this.log(`⚡️ Let's get you ${sdk_1.ux.colors.callOutCyan('started')}...`);
        };
    }
    async run() {
        try {
            this.logHelpMessage();
            const signupPipeline = asyncPipe_1.asyncPipe(this.askQuestions, this.logCreatingAccount, this.createUser, this.signinFlow.bind(this), this.trackSignup, this.logConfimationMessage);
            await signupPipeline(this.questions);
        }
        catch (err) {
            this.debug(err);
            this.config.runHook('error', { err });
        }
    }
}
AccountSignup.description = 'Creates an account to use with ops CLI.';
AccountSignup.flags = {
    help: base_1.flags.help({ char: 'h' }),
};
exports.default = AccountSignup;
