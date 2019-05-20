import Command from '../../base';
export default class AccountSupport extends Command {
    static description: string;
    static flags: {
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
    };
    run(this: any): Promise<void>;
}
