/**
 * @author: Brett Campbell (brett@hackcapital.com)
 * @date: Friday, 5th April 2019 12:06:07 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Friday, 3rd May 2019 12:02:37 pm
 * @copyright (c) 2019 CTO.ai
 *
 */
import { Op, RegistryAuth } from '../types';
export default function publish(this: any, options: {
    op: Op;
    registryAuth: RegistryAuth;
}): Promise<void>;
