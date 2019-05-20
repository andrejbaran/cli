"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const base_1 = tslib_1.__importStar(require("../../base"));
const sdk_1 = require("@cto.ai/sdk");
class TeamSwitch extends base_1.default {
    async run() {
        this.log("Here's the list of your teams:\n");
        // Gets the active team from the config
        const configData = await this.readConfig();
        const activeTeam = configData
            ? configData.team
            : {
                id: '',
                name: '',
            };
        // Gets the list of teams from the backend
        const response = await this.api.find('teams', {
            headers: { Authorization: this.accessToken },
        });
        const teams = response.data;
        // Adds necessary variables (e.g. displaynName) to each team
        const parsedTeams = this._setTeamsDisplayName(teams, activeTeam);
        // Gets the desired team by either the argument or the parsedTeams
        const teamSelected = await this._getSelectedTeamPrompt(parsedTeams);
        // Gets the desired team from the user's input
        const team = parsedTeams.find(t => t.name === teamSelected) || {
            name: '',
            id: '',
            displayName: '',
        };
        // Breaks if there is no matching team
        if (!team || !team.name) {
            this.log(`\n❌ There is no team with that name. Please select a different team`);
            process.exit();
        }
        this.log(`\n⏱ Switching teams`);
        // Writes the desired team into the config
        await this.writeConfig(configData, {
            team: { name: team.name, id: team.id },
        });
        this.log(`\n🚀 Huzzah! ${sdk_1.ux.colors.callOutCyan(team.name)} is now the active team.\n`);
    }
    /**
     * Displays the prompt to the user and returns the selection
     * @param teams The desired teams returned from the database
     * @returns The intended name, which is guaranteed to be unique
     */
    async _getSelectedTeamPrompt(teams) {
        // The prompt to show to the user
        const prompt = {
            type: 'list',
            name: 'teamSelected',
            message: 'Select a team',
            choices: teams.map(team => {
                return { name: team.displayName, value: team.name };
            }),
            bottomContent: `\n \n${sdk_1.ux.colors.white(`Or, run ${sdk_1.ux.colors.italic.dim('ops help')} for usage information.`)}`,
        };
        // Destructures and returns the desired input from the user
        const { teamSelected } = await sdk_1.ux.prompt(prompt);
        return teamSelected;
    }
    /**
     * Assigns a display name to the teams. Desired teams will have custom styling
     * @param teams The teams that the user has access to
     * @param activeTeam The team that is currently active
     */
    _setTeamsDisplayName(teams, activeTeam) {
        return teams.map(t => {
            // If the team is the user's active team, add custom styling to it
            if (activeTeam && t.name === activeTeam.name) {
                return Object.assign({}, t, { displayName: `${sdk_1.ux.colors.blue(t.name)} ${sdk_1.ux.colors.dim('[Active]')}` });
            }
            // If the team isn't the user's active team, simply copy the display name from the team name
            return Object.assign({}, t, { displayName: t.name });
        });
    }
}
TeamSwitch.description = 'Shows the list of your teams.';
TeamSwitch.flags = {
    help: base_1.flags.help({ char: 'h' }),
};
exports.default = TeamSwitch;
