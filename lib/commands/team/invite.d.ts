import Command, { flags } from '../../base';
import { OclifCommand } from '../../types';
export default class TeamInvite extends Command {
    static description: string;
    static strict: boolean;
    static flags: {
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        inviteesInput: flags.IOptionFlag<string | undefined>;
    };
    questions: OclifCommand[];
    run(): Promise<void>;
    private _printInviteResponses;
    private _getInvitesPrompt;
    private _validate;
    /**
     * Splits the invitees by either string or space
     * Handles the case of:
     * "username1,username2,username3" => ["username1", "username2", "username3"]
     * "username1, username2, username3" => ["username1", "username2", "username3"]
     * "username1 username2 username3" => ["username1", "username2", "username3"]
     * "username1,username2 username3" => ["username1", "username2", "username3"]
     * ", username1      ,   username2,,,,,,      username3 ,," => ["username1", "username2", "username3"]
     */
    private _splitInvitees;
    private _getActiveTeamId;
    private _inviteUserToTeam;
}
