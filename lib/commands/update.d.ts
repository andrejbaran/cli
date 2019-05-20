import Command from '../base';
export default class Update extends Command {
    static description: string;
    static flags: {
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
    };
    run(): Promise<void>;
    private _logUpdateMessage;
    private _trackAnalytics;
    private _askQuestion;
    private _updateVersion;
}
