/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Sunday, 28th April 2019 1:16:46 am
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Thursday, 2nd May 2019 4:31:09 pm
 * @copyright (c) 2019 CTO.ai
 */
import { FeathersClient } from './feathers';
export declare class MockBadApiService extends FeathersClient {
    get(): Promise<any>;
    find(): Promise<any>;
}
