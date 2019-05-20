"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const base_1 = tslib_1.__importDefault(require("../../base"));
const sdk_1 = require("@cto.ai/sdk");
const commander_1 = tslib_1.__importDefault(require("commander"));
const validate_1 = require("../../utils/validate");
const checkEmail = (input) => {
    return (validate_1.validateEmail(input) ||
        '🤔 That email format is invalid. Please check your email and try again.');
};
const emailPrompt = {
    type: 'input',
    name: 'email',
    message: 'Enter an email address to reset your password: ',
    validate: checkEmail,
};
const passwordPrompts = [
    {
        type: 'password',
        name: 'password',
        message: 'Enter a new password: ',
        validate: validate_1.validatePasswordFormat,
        mask: '*',
    },
    {
        type: 'password',
        name: 'passwordConfirm',
        message: 'Confirm your password: ',
        validate: validate_1.validateCpassword,
        mask: '*',
    },
];
const tokenErr = {
    consumed: 'Token already used',
    expired: 'Token already expired',
    postMessage: `Please request a new token by running ${sdk_1.ux.colors.italic.dim('ops account:reset.')}`,
};
class AccountReset extends base_1.default {
    startSpinner() {
        this.log('');
        sdk_1.ux.spinner.start(`${sdk_1.ux.colors.white('Working on it')}`);
    }
    async run() {
        const { args: [_, token], } = commander_1.default.parse(process.argv);
        if (!token) {
            const { email } = await sdk_1.ux.prompt([emailPrompt]);
            this.startSpinner();
            const res = await this.createToken(email);
            if (res.data) {
                sdk_1.ux.spinner.stop(`${sdk_1.ux.colors.green('Done!\n')}`);
                this.log(`Go to ${sdk_1.ux.colors.italic.dim(email)} to reset your password.`);
                process.exit();
            }
            sdk_1.ux.spinner.stop('❗️\n');
            this.log(`Uh-oh, we couldn't find any user associated with that email address.\nCheck your email and try again.\n`);
            return this.run();
        }
        const { password } = await sdk_1.ux.prompt(passwordPrompts);
        this.startSpinner();
        const res = await this.resetPassword(token, password);
        if (res.data) {
            sdk_1.ux.spinner.stop(`${sdk_1.ux.colors.green('Done!\n')}`);
            this.log(`${sdk_1.ux.colors.bold.green('✓')} Password reset successful.\n\nTo continue, please sign in by running ${sdk_1.ux.colors.italic.dim('ops account:signin')}.`);
            process.exit();
        }
        sdk_1.ux.spinner.stop('❗️\n');
        if (res.message) {
            switch (true) {
                case res.message.includes(tokenErr.consumed):
                    return this.log(`${tokenErr.consumed}. ${tokenErr.postMessage}`);
                case res.message.includes(tokenErr.expired):
                    return this.log(`${tokenErr.expired}. ${tokenErr.postMessage}`);
            }
        }
        this.log(`Sorry, we're unable to complete your request at this time.`);
        process.exit(1);
    }
}
AccountReset.description = 'Reset your password.';
exports.default = AccountReset;
