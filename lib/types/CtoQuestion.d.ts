import { Question } from 'inquirer';
export interface CtoQuestion extends Question {
    afterMessage?: string;
    afterMessageAppend?: string;
}
