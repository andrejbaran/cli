import { Question } from 'inquirer';
export interface QuestionInquirer extends Question {
    afterMessage?: string;
    afterMessageAppend?: string;
}
