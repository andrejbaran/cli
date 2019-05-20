import { Question } from 'inquirer';
import Command, { flags } from '../base';
import { Container, InitParams, InitPaths, CtoQuestion } from '../types';
export default class Init extends Command {
    static description: string;
    static flags: {
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        name: flags.IOptionFlag<string | undefined>;
        description: flags.IOptionFlag<string | undefined>;
    };
    questions: object[];
    srcDir: string;
    destDir: string;
    opName: string;
    opDescription: string;
    initPrompts: Container<CtoQuestion>;
    determineQuestions: ({ prompts, flags, }: {
        prompts: Container<Question<import("inquirer").Answers>>;
        flags: Partial<InitParams>;
    }) => Question<import("inquirer").Answers>[];
    askQuestions: (questions: Question<import("inquirer").Answers>[]) => Promise<any>;
    determineInitPaths: (flags: Partial<InitParams>) => (answers: Partial<InitParams>) => {
        initPaths: {
            templateDir: string;
            sharedDir: string;
            destDir: string;
        };
        initParams: {
            name?: string | undefined;
            description?: string | undefined;
            template?: string | undefined;
            help?: void | undefined;
        };
    };
    copyTemplateFiles: (input: {
        initPaths: InitPaths;
        initParams: InitParams;
    }) => Promise<{
        initPaths: InitPaths;
        initParams: InitParams;
    }>;
    customizePackageJson: (input: {
        initPaths: InitPaths;
        initParams: InitParams;
    }) => Promise<{
        initPaths: InitPaths;
        initParams: InitParams;
    }>;
    customizeOpsYaml: (input: {
        initPaths: InitPaths;
        initParams: InitParams;
    }) => Promise<{
        initPaths: InitPaths;
        initParams: InitParams;
    }>;
    logMessages: (input: {
        initPaths: InitPaths;
        initParams: InitParams;
    }) => Promise<{
        initPaths: InitPaths;
        initParams: InitParams;
    }>;
    trackAnalytics: (input: {
        initPaths: InitPaths;
        initParams: InitParams;
    }) => Promise<void>;
    private _validateName;
    private _validateDescription;
    run(): Promise<void>;
}
