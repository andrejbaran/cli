"use strict";
/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Sunday, 28th April 2019 1:16:46 am
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Wednesday, 1st May 2019 3:54:20 pm
 * @copyright (c) 2019 CTO.ai
 */
Object.defineProperty(exports, "__esModule", { value: true });
const feathers_1 = require("./feathers");
const test_1 = require("../constants/test");
class MockGoodApiService extends feathers_1.FeathersClient {
    async get() {
        return Promise.resolve({
            data: test_1.fakeToken,
            error: null,
        });
    }
    async find(service, payload) {
        return Promise.resolve({
            data: { fakeData: 'fakeData' },
            error: null,
        });
    }
}
exports.MockGoodApiService = MockGoodApiService;
