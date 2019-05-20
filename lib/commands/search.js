"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fuzzy_1 = tslib_1.__importDefault(require("fuzzy"));
const fs = tslib_1.__importStar(require("fs-extra"));
const path = tslib_1.__importStar(require("path"));
const yaml = tslib_1.__importStar(require("yaml"));
const base_1 = tslib_1.__importStar(require("../base"));
const asyncPipe_1 = require("../utils/asyncPipe");
const customErrors_1 = require("../errors/customErrors");
const opConfig_1 = require("../constants/opConfig");
class Search extends base_1.default {
    constructor() {
        super(...arguments);
        this.ops = [];
        this.showSearchMessage = (filter) => {
            this.log(`\n🔍 ${this.ux.colors.white('Searching team, public & local workspaces for ')} ${this.ux.colors.callOutCyan(filter || 'all ops')}.`);
            return filter;
        };
        this.getApiOps = async (filter) => {
            try {
                const query = filter
                    ? { search: filter, team_id: this.team.id }
                    : { team_id: this.team.id };
                const findResponse = await this.api.find('ops', {
                    query,
                    headers: {
                        Authorization: this.accessToken,
                    },
                });
                const { data: apiOps } = findResponse;
                return { apiOps };
            }
            catch (err) {
                throw new customErrors_1.APIError(err);
            }
        };
        this.getLocalOps = async ({ apiOps }) => {
            try {
                const manifest = await fs.readFile(path.join(process.cwd(), opConfig_1.OP_FILE), 'utf8');
                if (!manifest) {
                    return { apiOps, localOps: [] };
                }
                const { ops: localOps = [] } = yaml.parse(manifest);
                return { apiOps, localOps };
            }
            catch (_a) {
                return { apiOps, localOps: [] };
            }
        };
        this._removeIfNameOrDescriptionDontContainQuery = (filterQuery) => (localOp) => localOp.name.includes(filterQuery) ||
            localOp.description.includes(filterQuery);
        this._setTeamIdToLocal = (localOp) => (Object.assign({}, localOp, { teamID: opConfig_1.LOCAL }));
        this.filterLocalOps = (filterQuery = '') => ({ apiOps, localOps, }) => {
            if (!localOps.length) {
                return { apiOps, localOps };
            }
            const filteredLocalOps = localOps
                .filter(this._removeIfNameOrDescriptionDontContainQuery(filterQuery))
                .map(this._setTeamIdToLocal);
            return { apiOps, localOps: filteredLocalOps };
        };
        this._removeIfLocalExists = localOps => apiOp => {
            const match = localOps.find(localOp => localOp.name === apiOp.name);
            return !match;
        };
        this.resolveLocalAndApiOps = ({ apiOps, localOps, }) => {
            const filteredApiOps = apiOps.filter(this._removeIfLocalExists(localOps));
            return [...filteredApiOps, ...localOps];
        };
        this.checkData = async (filteredOps) => {
            if (!filteredOps.length) {
                this.log(`\n 😞 No ops found in your team, public or local workspaces. Try again or run ${this.ux.colors.callOutCyan('ops publish')} to create an op. \n`);
                process.exit();
            }
            this.ops = filteredOps;
        };
        this.askQuestion = async () => {
            return this.ux.prompt({
                type: 'autocomplete',
                name: 'runOp',
                pageSize: 5,
                message: `\nSelect a ${this.ux.colors.errorRed('\u2749')} team ${this.ux.colors.multiBlue('\u2749')} public or ${this.ux.colors.successGreen('\u2749')} local op to run ${this.ux.colors.reset.green('→')}`,
                source: this._autocompleteSearch.bind(this),
                bottomContent: `\n \n${this.ux.colors.white(`Or, run ${this.ux.colors.callOutCyan('ops help')} for usage information.`)}`,
            });
        };
        this.showRunMessage = answer => {
            const { runOp } = answer;
            this.log(`\n💻 Run ${this.ux.colors.green('$')} ${this.ux.colors.italic.dim('ops run ' + runOp.name)} to test your op. \n`);
        };
        this.sendAnalytics = (filter) => () => {
            try {
                this.analytics.track({
                    userId: this.user.email,
                    event: 'Ops CLI Search',
                    properties: {
                        email: this.user.email,
                        username: this.user.username,
                        results: this.ops.length,
                        filter,
                    },
                });
            }
            catch (err) {
                throw new customErrors_1.AnalyticsError(err);
            }
        };
        this.fuzzyFilterParams = () => {
            const list = this.ops.map(op => {
                const opName = this._formatOpName(op);
                return {
                    name: `${opName} - ${op.description}`,
                    value: op,
                };
            });
            const options = { extract: el => el.name };
            return { list, options };
        };
        this._formatOpName = (op) => {
            const opName = this.ux.colors.reset.white(op.name);
            switch (op.teamID) {
                case this.team.id:
                    return `${this.ux.colors.reset(this.ux.colors.errorRed('\u2749'))} ${opName}`;
                case opConfig_1.LOCAL:
                    return `${this.ux.colors.reset(this.ux.colors.successGreen('\u2749'))} ${opName} `;
                default:
                    return `${this.ux.colors.reset(this.ux.colors.multiBlue('\u2749'))} ${opName} `;
            }
        };
    }
    async _autocompleteSearch(_, input = '') {
        const { list, options } = this.fuzzyFilterParams();
        const fuzzyResult = fuzzy_1.default.filter(input, list, options);
        return fuzzyResult.map(result => result.original);
    }
    async run() {
        try {
            this.isLoggedIn();
            const { args: { filter = '' }, } = this.parse(Search);
            const searchPipeline = asyncPipe_1.asyncPipe(this.showSearchMessage, this.getApiOps, this.getLocalOps, this.filterLocalOps(filter), this.resolveLocalAndApiOps, this.checkData, this.askQuestion, this.showRunMessage, this.sendAnalytics(filter));
            await searchPipeline(filter);
        }
        catch (err) {
            this.debug(err);
            this.config.runHook('error', { err });
        }
    }
}
Search.description = 'Search for ops in your workspaces.';
Search.args = [
    {
        name: 'filter',
        description: 'Filters op results which include filter text in op name or description.',
    },
];
Search.flags = {
    help: base_1.flags.help({ char: 'h' }),
};
exports.default = Search;
