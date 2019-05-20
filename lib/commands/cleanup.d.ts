import Command from '../base';
import { FindResponse } from '../types';
import { FeathersClient } from '../services/feathers';
export declare const getOps: (opName: string, teamId: string, accessToken: string, api: FeathersClient) => Promise<FindResponse>;
export declare const formImageName: (nameOrId: string, teamName: string, registryHost: string) => string;
export declare const removeImage: (docker: any, imageName: string) => Promise<void>;
export declare class Cleanup extends Command {
    static description: string;
    static flags: {
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
    };
    static args: {
        name: string;
        description: string;
    }[];
    run(): Promise<void>;
}
