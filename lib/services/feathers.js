"use strict";
/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Sunday, 28th April 2019 1:16:46 am
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Monday, 13th May 2019 2:00:31 pm
 * @copyright (c) 2019 CTO.ai
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const feathers_1 = tslib_1.__importDefault(require("@feathersjs/feathers"));
const rest_client_1 = tslib_1.__importDefault(require("@feathersjs/rest-client"));
const axios_1 = tslib_1.__importDefault(require("axios"));
const url = tslib_1.__importStar(require("url"));
const env_1 = require("../constants/env");
exports.localFeathersHost = url.resolve(env_1.OPS_API_HOST, env_1.OPS_API_PATH);
class FeathersClient {
    constructor(apiUrl = exports.localFeathersHost) {
        this.feathersClient = feathers_1.default().configure(rest_client_1.default(apiUrl).axios(axios_1.default));
    }
    async find(service, payload) {
        return this.feathersClient.service(service).find(payload);
    }
    async create(service, payload, params) {
        return this.feathersClient.service(service).create(payload, params);
    }
    async patch(service, token, payload) {
        return this.feathersClient.service(service).patch(token, payload);
    }
    async remove(service, id, params) {
        return this.feathersClient.service(service).remove(id, params);
    }
}
exports.FeathersClient = FeathersClient;
