import { Question } from 'inquirer'

// Wasn't sure how `afterMessage` and `afterMessageAppend` was working in the first place,
// as the base inquirer package doesn't have these variables and no fallback of default values of
// any kind...
export interface QuestionInquirer extends Question {
  afterMessage?: string
  afterMessageAppend?: string
}
