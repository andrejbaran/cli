import Docker from 'dockerode';
import { Config, Op } from '.';
export declare type RunCommandArgs = {
    args: {
        nameOrPath: string;
    };
    flags: {
        build?: boolean;
        help?: boolean;
    };
    opParams: string[];
};
export declare type RunPipeline = {
    config: Config;
    isPublished: boolean;
    op: Op;
    options: Docker.ContainerCreateOptions;
    parsedArgs: RunCommandArgs;
};
