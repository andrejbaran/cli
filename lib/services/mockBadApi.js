"use strict";
/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Sunday, 28th April 2019 1:16:46 am
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Thursday, 2nd May 2019 4:31:09 pm
 * @copyright (c) 2019 CTO.ai
 */
Object.defineProperty(exports, "__esModule", { value: true });
const feathers_1 = require("./feathers");
class MockBadApiService extends feathers_1.FeathersClient {
    async get() {
        return Promise.reject('broken!');
    }
    async find() {
        return Promise.reject('broken!');
    }
}
exports.MockBadApiService = MockBadApiService;
