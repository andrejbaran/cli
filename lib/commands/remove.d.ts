import Command from '../base';
export default class Remove extends Command {
    static description: string;
    static args: {
        name: string;
        description: string;
    }[];
    static flags: {
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
    };
    run(): Promise<void>;
}
