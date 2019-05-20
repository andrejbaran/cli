import Command from '../base';
export default class Build extends Command {
    static description: string;
    static flags: {
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
    };
    static args: {
        name: string;
        description: string;
    }[];
    run(this: any): Promise<void>;
}
