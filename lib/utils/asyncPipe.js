"use strict";
/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Tuesday, 23rd April 2019 11:05:01 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Wednesday, 24th April 2019 12:45:12 pm
 * @copyright (c) 2019 CTO.ai
 */
Object.defineProperty(exports, "__esModule", { value: true });
// based on https://github.com/obengwilliam/pipeawait
const asyncPipe = (...fns) => (param) => fns.reduce(async (acc, fn) => fn(await acc), param);
exports.asyncPipe = asyncPipe;
const _trace = (msg) => (x) => {
    console.log(msg, x);
    return x;
};
exports._trace = _trace;
