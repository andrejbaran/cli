/**
 * @author: Brett Campbell (brett@hackcapital.com)
 * @date: Friday, 5th April 2019 12:06:07 pm
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Friday, 3rd May 2019 4:57:32 pm
 * @copyright (c) 2019 CTO.ai
 */
import { Op } from '../types';
declare function build(this: any, options: {
    tag: string;
    opPath: string;
    op: Op;
}): Promise<void>;
export default build;
