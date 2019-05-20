/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Sunday, 28th April 2019 1:16:46 am
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Monday, 13th May 2019 2:00:31 pm
 * @copyright (c) 2019 CTO.ai
 */
/// <reference types="feathersjs__feathers" />
import feathers from '@feathersjs/feathers';
export declare const localFeathersHost: string;
export declare class FeathersClient {
    feathersClient: feathers.Application;
    constructor(apiUrl?: string);
    find(service: string, payload: object): Promise<any>;
    create(service: string, payload: object, params?: object): Promise<any>;
    patch(service: string, token: string, payload: object): Promise<any>;
    remove(service: string, id: string, params?: object): Promise<any>;
}
