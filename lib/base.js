"use strict";
/**
 * @author: Brett Campbell (brett@hackcapital.com)
 * @date: Friday, 5th April 2019 12:06:07 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Tuesday, 14th May 2019 11:26:16 am
 * @copyright (c) 2019 CTO.ai
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const sdk_1 = require("@cto.ai/sdk");
const command_1 = tslib_1.__importStar(require("@oclif/command"));
exports.flags = command_1.flags;
const analytics_node_1 = tslib_1.__importDefault(require("analytics-node"));
const fs_extra_1 = require("fs-extra");
const path = tslib_1.__importStar(require("path"));
const get_docker_1 = tslib_1.__importDefault(require("./utils/get-docker"));
const asyncPipe_1 = require("./utils/asyncPipe");
const guards_1 = require("./utils/guards");
const env_1 = require("./constants/env");
const feathers_1 = require("./services/feathers");
const customErrors_1 = require("./errors/customErrors");
class CTOCommand extends command_1.default {
    constructor(argv, config, api = new feathers_1.FeathersClient()) {
        super(argv, config);
        this.api = api;
        this.analytics = new analytics_node_1.default(env_1.OPS_SEGMENT_KEY);
        this.ux = sdk_1.ux;
        this.getRegistryAuth = async (accessToken) => {
            try {
                const registryResponse = await this.api.find('registry/token', {
                    query: {
                        registryProject: this.team.name,
                    },
                    headers: { Authorization: accessToken },
                });
                if (!registryResponse.data ||
                    !registryResponse.data.registry_tokens.length) {
                    throw new customErrors_1.UserUnauthorized(this.state);
                }
                const { registryProject = '', registryUser = '', registryPass = '', } = registryResponse.data.registry_tokens[0];
                const projectFullName = `${env_1.OPS_REGISTRY_HOST}/${registryProject}`;
                const projectUrl = `https://${projectFullName}`;
                const registryAuth = {
                    authconfig: {
                        username: registryUser,
                        password: registryPass,
                        serveraddress: projectUrl,
                    },
                    projectFullName,
                };
                return registryAuth;
            }
            catch (err) {
                this.config.runHook('error', { err });
            }
        };
        this.readConfig = async () => {
            return fs_extra_1.readJson(path.join(this.config.configDir, 'config.json')).catch(() => {
                return {};
            });
        };
        this.handleTeamNotFound = () => {
            this.error('team not found');
            return {
                id: '',
                name: 'not found',
            };
        };
        this.getTeam = (username, teams) => {
            const team = teams.find(({ name }) => name === username);
            return team || this.handleTeamNotFound();
        };
        this._includeRegistryHost = (debug) => debug ? { registryHost: env_1.OPS_REGISTRY_HOST, nodeEnv: env_1.NODE_ENV } : {};
        this.formatConfigObject = (signinData) => {
            const { accessToken, meResponse: { teams, me: { id, emails, username }, }, } = signinData;
            const configObj = {
                team: this.getTeam(username, teams),
                accessToken,
                user: Object.assign({ _id: id, email: emails[0].address, username: username }, this._includeRegistryHost(env_1.DEBUG)),
            };
            return configObj;
        };
        this.writeConfig = async (oldConfigObj = {}, newConfigObj) => {
            const mergedConfigObj = Object.assign({}, oldConfigObj, newConfigObj);
            await fs_extra_1.outputJson(path.join(this.config.configDir, 'config.json'), mergedConfigObj);
            return mergedConfigObj;
        };
        this.clearConfig = async (args) => {
            const configPath = path.join(this.config.configDir, 'config.json');
            await fs_extra_1.remove(configPath);
            return args;
        };
        this.authenticateUser = async ({ credentials = guards_1.handleMandatory('credentials'), }) => {
            if (!credentials || !credentials.password || !credentials.email) {
                throw 'invalid user credentials';
            }
            const res = await this.api
                .create('login', {
                email: credentials.email,
                password: credentials.password,
            })
                .catch(err => {
                throw new customErrors_1.APIError(err);
            });
            const { data: accessToken = guards_1.handleUndefined('accessToken') } = res;
            return { accessToken, credentials };
        };
        this.fetchUserInfo = async (args) => {
            if (!args) {
                this.ux.spinner.stop(`failed`);
                this.log('missing parameter');
                process.exit();
            }
            const { accessToken } = args;
            if (!accessToken) {
                this.ux.spinner.stop(`❗️\n`);
                this.log(`🤔 Sorry, we couldn’t find an account with that email or password.\nForgot your password? Run ${this.ux.colors.bold('ops account:reset')}.\n`);
                process.exit();
            }
            const { data: meResponse, } = await this.api
                .find('me', {
                headers: { Authorization: accessToken },
            })
                .catch(err => {
                throw new customErrors_1.APIError(err);
            });
            return { meResponse, accessToken };
        };
    }
    async init() {
        try {
            const config = await this.readConfig();
            const { user, accessToken, team } = config;
            this.accessToken = accessToken;
            this.user = user;
            this.team = team;
            this.state = { config };
            this.docker = await this._getDocker();
        }
        catch (err) {
            this.config.runHook('error', { err });
        }
    }
    isLoggedIn() {
        if (!this.user) {
            this.log('');
            this.log('✋ Sorry you need to be logged in to do that.');
            this.log(`🎳 You can sign up with ${this.ux.colors.green('$')} ${this.ux.colors.callOutCyan('ops account:signup')}`);
            this.log('');
            this.log('❔ Please reach out to us with questions anytime!');
            this.log(`⌚️ We are typically available ${this.ux.colors.white('Monday-Friday 9am-5pm PT')}.`);
            this.log(`📬 You can always reach us by ${this.ux.url('email', `mailto:${env_1.INTERCOM_EMAIL}`)} ${this.ux.colors.dim(`(${env_1.INTERCOM_EMAIL})`)}.\n`);
            this.log("🖖 We'll get back to you as soon as we possibly can.");
            this.log('');
            process.exit();
        }
    }
    async signinFlow(credentials) {
        //to-do: check if credentials are set first
        const signinFlowPipeline = asyncPipe_1.asyncPipe(this.authenticateUser, this.fetchUserInfo, this.clearConfig, this.formatConfigObject, this.writeConfig, this.readConfig);
        const config = await signinFlowPipeline({ credentials });
        return config;
    }
    async validateUniqueField(query) {
        const response = await this.api
            .find('validate', {
            query,
        })
            .catch(err => {
            throw new customErrors_1.APIError(err);
        });
        return response.data;
    }
    async _getDocker() {
        if (env_1.NODE_ENV === 'test')
            return;
        return get_docker_1.default(this, 'base');
    }
    async createToken(email) {
        return this.api.create('reset', { email });
    }
    async resetPassword(token, password) {
        return this.api.patch('reset', token, { password });
    }
}
exports.default = CTOCommand;
