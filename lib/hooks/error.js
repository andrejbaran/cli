"use strict";
/**
 * @author: Prachi Singh (prachi@hackcapital.com)
 * @date: Tuesday, 23rd April 2019 10:55:23 am
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Tuesday, 14th May 2019 11:17:26 am
 *
 * DESCRIPTION: This hook is used for error handling
 *
 * @copyright (c) 2019 Hack Capital
 */
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_1 = require("@cto.ai/sdk");
const errorSource_1 = require("../constants/errorSource");
/**
 * Error hook to handle the errors
 *
 * @export
 * @param {*} this
 * @param {{ err: Error }} options
 */
async function error(options) {
    sdk_1.log.error(options.err);
    const { UNEXPECTED } = errorSource_1.errorSource;
    const { extra } = options.err;
    const { message } = options.err;
    if (extra && extra.source === UNEXPECTED) {
        this.log(`\n 😰 We've encountered a problem. Please try again or contact support@cto.ai and we'll do our best to help. \n`);
        process.exit(1);
    }
    this.log(`\n ${message}`);
    if (extra && extra.exit)
        process.exit();
}
exports.default = error;
