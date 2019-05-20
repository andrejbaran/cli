import Command from '../base';
import { Op, LocalOp } from '../types';
export default class Search extends Command {
    static description: string;
    static args: {
        name: string;
        description: string;
    }[];
    static flags: {
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
    };
    ops: Op[];
    showSearchMessage: (filter: string) => string;
    getApiOps: (filter: string) => Promise<{
        apiOps: Op[] | null;
    }>;
    getLocalOps: ({ apiOps }: {
        apiOps: Op[];
    }) => Promise<{
        apiOps: Op[];
        localOps: any;
    }>;
    _removeIfNameOrDescriptionDontContainQuery: (filterQuery: string) => (localOp: LocalOp) => boolean;
    _setTeamIdToLocal: (localOp: LocalOp) => {
        teamID: string;
        name: string;
        description: string;
        run: string;
        flags: string[];
        env: string[];
        help: {
            usage: string;
            arguments: {
                [key: string]: string;
            };
            options: {
                [key: string]: string;
            };
        };
        before: string[];
        after: string[];
    };
    filterLocalOps: (filterQuery?: string) => ({ apiOps, localOps, }: {
        apiOps: Op[];
        localOps: LocalOp[];
    }) => {
        apiOps: Op[];
        localOps: LocalOp[];
    };
    _removeIfLocalExists: (localOps: any) => (apiOp: any) => boolean;
    resolveLocalAndApiOps: ({ apiOps, localOps, }: {
        apiOps: Op[];
        localOps: LocalOp[];
    }) => (Op | LocalOp)[];
    checkData: (filteredOps: Op[]) => Promise<void>;
    askQuestion: () => Promise<any>;
    showRunMessage: (answer: any) => void;
    sendAnalytics: (filter: string) => () => void;
    private _autocompleteSearch;
    private fuzzyFilterParams;
    private _formatOpName;
    run(): Promise<void>;
}
