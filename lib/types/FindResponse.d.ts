import { Op } from './Op';
export declare type FindResponse = {
    data: Op[] | null;
    error: object[] | null;
};
export declare type FindQuery = {
    team_id: string;
    name?: string;
    search?: string;
};
