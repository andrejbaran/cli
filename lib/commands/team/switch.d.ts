import Command from '../../base';
export default class TeamSwitch extends Command {
    static description: string;
    static flags: {
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
    };
    run(): Promise<void>;
    /**
     * Displays the prompt to the user and returns the selection
     * @param teams The desired teams returned from the database
     * @returns The intended name, which is guaranteed to be unique
     */
    private _getSelectedTeamPrompt;
    /**
     * Assigns a display name to the teams. Desired teams will have custom styling
     * @param teams The teams that the user has access to
     * @param activeTeam The team that is currently active
     */
    private _setTeamsDisplayName;
}
