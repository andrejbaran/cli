/**
 * @author: Brett Campbell (brett@hackcapital.com)
 * @date: Friday, 5th April 2019 12:06:07 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Tuesday, 14th May 2019 11:26:16 am
 * @copyright (c) 2019 CTO.ai
 *
 */
import Command, { flags } from '@oclif/command';
import * as OClifConfig from '@oclif/config';
import Analytics from 'analytics-node';
import Docker from 'dockerode';
import { Config, User, Team, UserCredentials, ValidationFields, MeResponse, RegistryAuth, SigninPipeline, ApiService } from './types';
declare abstract class CTOCommand extends Command {
    protected api: ApiService;
    analytics: Analytics;
    docker: Docker | undefined;
    accessToken: string;
    user: User;
    team: Team;
    state: {
        config: Config;
    };
    ux: any;
    constructor(argv: string[], config: OClifConfig.IConfig, api?: ApiService);
    init(): Promise<void>;
    getRegistryAuth: (accessToken: string) => Promise<RegistryAuth | undefined>;
    isLoggedIn(): void;
    readConfig: () => Promise<Config>;
    handleTeamNotFound: () => {
        id: string;
        name: string;
    };
    getTeam: (username: string, teams: Team[]) => Team;
    _includeRegistryHost: (debug: string | number | boolean) => {
        registryHost: string;
        nodeEnv: string;
    } | {
        registryHost?: undefined;
        nodeEnv?: undefined;
    };
    formatConfigObject: (signinData: SigninPipeline) => Config;
    writeConfig: (oldConfigObj: Partial<Config> | null | undefined, newConfigObj: Partial<Config>) => Promise<Partial<Config>>;
    clearConfig: (args: unknown) => Promise<unknown>;
    authenticateUser: ({ credentials, }: Partial<SigninPipeline>) => Promise<{
        accessToken: string;
        credentials: UserCredentials;
    }>;
    fetchUserInfo: (args: SigninPipeline) => Promise<{
        meResponse: MeResponse;
        accessToken: string;
    }>;
    signinFlow(credentials: UserCredentials): Promise<Config>;
    validateUniqueField(query: ValidationFields): Promise<boolean>;
    private _getDocker;
    createToken(email: string): Promise<any>;
    resetPassword(token: string, password: string): Promise<any>;
}
export { CTOCommand as default, flags };
