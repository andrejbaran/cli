import { Config, UserCredentials, QuestionInquirer } from '../../types';
import Command from '../../base';
interface SignUpData {
    email: string | undefined;
    password: string | undefined;
    username: string | undefined;
}
export default class AccountSignup extends Command {
    static description: string;
    static flags: {
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
    };
    _validateEmail: (input: string) => Promise<true | "❗ The format of your email is invalid, please check that it is correct and try again." | "❗ Email is already used with another account, please try again using another.">;
    _validateUsername: (input: any) => Promise<true | "😞 Username is already taken, please try using another.">;
    questions: QuestionInquirer[];
    logConfimationMessage: () => void;
    trackSignup: (config: Config) => void;
    createUser: (input: SignUpData) => Promise<UserCredentials>;
    logCreatingAccount: (input: SignUpData) => {
        email: string | undefined;
        password: string | undefined;
        username: string | undefined;
    };
    askQuestions: (questions: QuestionInquirer[]) => Promise<{} | SignUpData>;
    logHelpMessage: () => void;
    run(): Promise<void>;
}
export {};
