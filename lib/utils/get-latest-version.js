"use strict";
/**
 * Author: Brett Campbell (brett@hackcapital.com)
 * Date: Friday, 12th April 2019 10:33:26 am
 * Last Modified By: Brett Campbell (brett@hackcapital.com)
 * Last Modified Time: Friday, 12th April 2019 10:33:26 am
 *
 * DESCRIPTION
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const axios_1 = tslib_1.__importDefault(require("axios"));
const customErrors_1 = require("../errors/customErrors");
async function getLatestVersion() {
    try {
        const { data } = await axios_1.default({
            method: 'GET',
            url: '/@cto.ai/ops',
            baseURL: 'https://registry.npmjs.org/',
        });
        const { latest } = data['dist-tags'];
        return latest;
    }
    catch (err) {
        throw new customErrors_1.CouldNotGetLatestVersion(err);
    }
}
exports.default = getLatestVersion;
