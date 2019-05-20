/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Sunday, 28th April 2019 1:16:46 am
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Wednesday, 1st May 2019 3:54:20 pm
 * @copyright (c) 2019 CTO.ai
 */
import { FeathersClient } from './feathers';
export declare class MockGoodApiService extends FeathersClient {
    get(): Promise<any>;
    find(service: string, payload: object): Promise<any>;
}
