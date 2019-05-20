/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Tuesday, 30th April 2019 12:07:49 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Wednesday, 8th May 2019 7:33:53 pm
 * @copyright (c) 2019 CTO.ai
 */
import { Question } from 'inquirer';
import Command, { flags } from '../../base';
import { Config, Container, UserCredentials } from '../../types';
export declare const signinPrompts: Container<Question>;
export default class AccountSignin extends Command {
    static description: string;
    static flags: {
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        email: flags.IOptionFlag<string | undefined>;
        password: flags.IOptionFlag<string | undefined>;
    };
    sendAnalytics: (config: Config) => Config;
    showWelcomeMessage: (config: Config) => Config;
    signin: (credentials: UserCredentials) => Promise<Config>;
    determineQuestions: (prompts: Container<Question<import("inquirer").Answers>>) => (flags: UserCredentials) => Question<import("inquirer").Answers>[];
    askQuestions: (questions: Question<import("inquirer").Answers>[]) => Promise<{} | UserCredentials>;
    determineUserCredentials: (flags: Partial<UserCredentials>) => (answers: Partial<UserCredentials>) => Partial<UserCredentials>;
    logMessages: (input: UserCredentials) => {
        email: string | undefined;
        password: string | undefined;
        help?: void | undefined;
        username?: string | undefined;
    };
    run(): Promise<void>;
}
