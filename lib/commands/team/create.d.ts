import Command, { flags } from '../../base';
export default class TeamCreate extends Command {
    static description: string;
    static flags: {
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        name: flags.IOptionFlag<string | undefined>;
    };
    teamNamePrompt: {
        type: string;
        name: string;
        message: string;
        afterMessage: string;
        validate: (input: string) => Promise<string | boolean>;
    };
    questions: object[];
    run(): Promise<void>;
    validateTeamName(input: string): Promise<boolean | string>;
}
