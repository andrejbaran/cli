import Command from '../../base';
export default class TeamJoin extends Command {
    static description: string;
    startSpinner(): void;
    run(): Promise<void>;
    joinTeam(inviteCode: string): Promise<any>;
}
