/**
 * @author: Brett Campbell (brett@hackcapital.com)
 * @date: Saturday, 6th April 2019 10:39:58 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Thursday, 16th May 2019 4:54:26 pm
 * @copyright (c) 2019 CTO.ai
 *
 * DESCRIPTION
 *
 */
/// <reference types="node" />
import Docker from 'dockerode';
import { SpawnOptions } from 'child_process';
import { Question } from 'inquirer';
import Command from '../base';
import { Op, RegistryAuth, Config, Container, RunPipeline, LocalOp, RunCommandArgs, ChildProcessError } from '../types';
import { LocalOpPipelineError } from '../types/ChildProcessError';
declare type LocalHook = 'main command' | 'before-hook' | 'after-hook';
export interface CommandInfo {
    hookType: LocalHook;
    command: string;
}
export default class Run extends Command {
    static description: string;
    static flags: {
        help: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        build: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
    };
    static strict: boolean;
    static args: {
        name: string;
        description: string;
    }[];
    container: Docker.Container | undefined;
    prompts: Container<Question>;
    useCustomParser: (options: typeof Run, argv: string[]) => {
        args: any;
        flags: any;
        opParams: string[];
    };
    getOpFromFs: (manifestPath: string, opParams: string[], { team }: Config) => Promise<{
        op: {
            image: string;
            bind: string[];
            createdAt: string;
            creatorId: string;
            description: string;
            env: string[];
            filesystem?: boolean | undefined;
            help: {
                usage: string;
                arguments: {
                    [key: string]: string;
                };
                options: {
                    [key: string]: string;
                };
            };
            id: string;
            name: string;
            network?: string | undefined;
            ownerId?: string | undefined;
            packagePath?: string | null | undefined;
            parameters?: import("../types/Op").IParameters[] | null | undefined;
            run: string;
            src: string[];
            tag: string;
            teamID: string;
            updatedAt: string;
            updaterId: string;
            version: string;
            workdir?: string | undefined;
            mountCwd: boolean;
            mountHome: boolean;
        };
        isPublished: boolean;
    }>;
    getOpFromAPI: (opNameOrPath: string, config: Config) => Promise<{
        op: any;
        isPublished: boolean;
    }>;
    printCustomHelp: (op: Op) => void;
    getOpConfig: ({ parsedArgs, config, ...rest }: RunPipeline) => Promise<{
        op: any;
        isPublished: boolean;
        parsedArgs: RunCommandArgs;
        config: Config;
        options: Docker.ContainerCreateOptions;
    }>;
    imageFilterPredicate: (repo: string) => ({ RepoTags }: Docker.ImageInfo) => string | undefined;
    findLocalImage: ({ id, name }: Op, { team }: Config) => Promise<string | undefined>;
    buildImage: (op: Op, nameOrPath: string) => Promise<void>;
    getAuthConfig: (accessToken: string) => Promise<RegistryAuth>;
    updateStatusBar: (stream: NodeJS.ReadWriteStream, { parser, bar }: {
        parser: any;
        bar: any;
    }) => (resolve: (data: any) => void, reject: (err: Error) => void) => Promise<void>;
    getProgressBarText: (status: string, { name }: Op) => {
        speed: string;
    };
    setParser: (op: Op, getFn: (status: string, op: Op) => {
        speed: string;
    }) => {
        parser: import("stream").Transform;
        bar: any;
    };
    pullImageFromRegistry: (op: Op, isPublished: boolean) => Promise<string>;
    getImage: ({ op, config, parsedArgs, isPublished }: RunPipeline) => Promise<{
        op: {
            image: string | void;
            bind: string[];
            createdAt: string;
            creatorId: string;
            description: string;
            env: string[];
            filesystem?: boolean | undefined;
            help: {
                usage: string;
                arguments: {
                    [key: string]: string;
                };
                options: {
                    [key: string]: string;
                };
            };
            id: string;
            name: string;
            network?: string | undefined;
            ownerId?: string | undefined;
            packagePath?: string | null | undefined;
            parameters?: import("../types/Op").IParameters[] | null | undefined;
            run: string;
            src: string[];
            tag: string;
            teamID: string;
            updatedAt: string;
            updaterId: string;
            version: string;
            workdir?: string | undefined;
            mountCwd: boolean;
            mountHome: boolean;
        };
        config: Config;
    }>;
    convertEnvStringsToObject: (acc: Container<string>, curr: string) => {
        [x: string]: string;
    };
    overrideEnvWithProcessEnv: (processEnv: Container<string | undefined>) => ([key, val,]: [string, string]) => string[];
    concatenateKeyValToString: ([key, val]: [string, string]) => string;
    setEnvs: (processEnv: Container<string | undefined>) => ({ op, config, ...rest }: RunPipeline) => {
        config: Config;
        op: {
            env: string[];
            bind: string[];
            createdAt: string;
            creatorId: string;
            description: string;
            filesystem?: boolean | undefined;
            help: {
                usage: string;
                arguments: {
                    [key: string]: string;
                };
                options: {
                    [key: string]: string;
                };
            };
            id: string;
            image: string | void;
            name: string;
            network?: string | undefined;
            ownerId?: string | undefined;
            packagePath?: string | null | undefined;
            parameters?: import("../types/Op").IParameters[] | null | undefined;
            run: string;
            src: string[];
            tag: string;
            teamID: string;
            updatedAt: string;
            updaterId: string;
            version: string;
            workdir?: string | undefined;
            mountCwd: boolean;
            mountHome: boolean;
        };
        isPublished: boolean;
        options: Docker.ContainerCreateOptions;
        parsedArgs: RunCommandArgs;
    };
    replaceHomeAlias: (bindPair: string) => string;
    setBinds: ({ op, ...rest }: RunPipeline) => {
        op: {
            bind: string[];
            createdAt: string;
            creatorId: string;
            description: string;
            env: string[];
            filesystem?: boolean | undefined;
            help: {
                usage: string;
                arguments: {
                    [key: string]: string;
                };
                options: {
                    [key: string]: string;
                };
            };
            id: string;
            image: string | void;
            name: string;
            network?: string | undefined;
            ownerId?: string | undefined;
            packagePath?: string | null | undefined;
            parameters?: import("../types/Op").IParameters[] | null | undefined;
            run: string;
            src: string[];
            tag: string;
            teamID: string;
            updatedAt: string;
            updaterId: string;
            version: string;
            workdir?: string | undefined;
            mountCwd: boolean;
            mountHome: boolean;
        };
        config: Config;
        isPublished: boolean;
        options: Docker.ContainerCreateOptions;
        parsedArgs: RunCommandArgs;
    };
    setOpUrl: (op: Op, { team }: Config, isPublished: boolean) => string;
    getOptions: ({ op, config, isPublished, ...rest }: RunPipeline) => {
        op: Op;
        options: {
            AttachStderr: boolean;
            AttachStdin: boolean;
            AttachStdout: boolean;
            Cmd: string[];
            Env: string[];
            WorkingDir: string;
            HostConfig: {
                Binds: string[];
                NetworkMode: string | undefined;
            };
            Image: string;
            OpenStdin: boolean;
            StdinOnce: boolean;
            Tty: boolean;
            Volumes: {};
            VolumesFrom: never[];
        };
        parsedArgs: RunCommandArgs;
    };
    createDockerContainer: ({ op, options, ...rest }: RunPipeline) => Promise<{
        op: Op;
        options: Docker.ContainerCreateOptions;
        config: Config;
        isPublished: boolean;
        parsedArgs: RunCommandArgs;
    }>;
    attachToContainer: (state: RunPipeline) => Promise<RunPipeline>;
    resize: () => void;
    handleExit: (stream: NodeJS.ReadWriteStream, isRaw: boolean) => void;
    handleStream: (stream: NodeJS.ReadWriteStream) => void;
    startDockerContainer: (stream: NodeJS.ReadWriteStream) => Promise<void>;
    sendAnalytics: ({ op }: RunPipeline) => void;
    _promptForHomeDirectory: (mountHome: boolean, { ignoreMountWarnings }: Config) => Promise<any>;
    _promptToIgnoreWarning: (mountHome: boolean, { ignoreMountWarnings }: Config) => Promise<any>;
    _doBindMountChecks: (mountHome: boolean, config: Config) => Promise<void>;
    findLocalOp(manifestPath: string, nameOrPath: string): Promise<LocalOp | undefined>;
    printMessage(bold: string, normal?: string): void;
    printErrorMessage({ code, signal }: ChildProcessError): void;
    _runLocalOp: (options: SpawnOptions) => (commandInfo: CommandInfo) => ({ errors, args, }: {
        errors: LocalOpPipelineError[];
        args: string[];
    }) => Promise<{
        errors: LocalOpPipelineError[];
        args: string[];
    }>;
    _runLocalOpHof: (options: SpawnOptions) => (commandInfo: CommandInfo) => ({ errors, args, }: {
        errors: LocalOpPipelineError[];
        args: string[];
    }) => Promise<{
        errors: LocalOpPipelineError[];
        args: string[];
    }>;
    labelTheCommand: (hookType: LocalHook) => (command: string) => CommandInfo;
    createArrayOfAllLocalCommands: ({ before, run, after }: LocalOp, options: SpawnOptions) => Function[];
    convertCommandToSpawnFunction: (options: SpawnOptions) => (commandInfo: CommandInfo) => Function;
    runLocalOps(localOp: LocalOp, parsedArgs: RunCommandArgs): Promise<void>;
    getLocalOpIfExists({ args: { nameOrPath } }: RunCommandArgs): Promise<LocalOp | null | undefined>;
    run(): Promise<void>;
}
export {};
