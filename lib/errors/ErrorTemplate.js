"use strict";
/**
 * @author: Prachi Singh (prachi@hackcapital.com)
 * @date: Monday, 6th May 2019 11:11:49 am
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Tuesday, 14th May 2019 11:42:24 am
 *
 * DESCRIPTION: Base class that the custom errors should be extending from
 * Error template that provides a modular, extensible and customizable errors.
 * Sourced from https://git.cto.ai/hackcapital/tools/errors
 * Modified slightly to fit the application's need
 *
 * @copyright (c) 2019 Hack Capital
 */
Object.defineProperty(exports, "__esModule", { value: true });
const errorSource_1 = require("../constants/errorSource");
const { UNEXPECTED } = errorSource_1.errorSource;
/**
 * ErrorTemplate class provide a base class for customized errors
 *
 * @extends Error
 */
class ErrorTemplate extends Error {
    /**
     * @constructor
     *
     * @param {String} [message] Error Message
     * @param {Object} [extra] Append any extra information to the error message
     * @param {Number} [statusCode] Specific for HTTP request, e.g.: 404
     * @param {String} [errorCode] Error codes, e.g.: U0010
     * @param {Error} [original] Original error object
     */
    constructor(message, original, extra = { exit: true, source: UNEXPECTED }, statusCode, errorCode) {
        if (!message)
            throw new Error('Need to specify a message');
        super(message);
        if (errorCode)
            this.errorCode = errorCode;
        if (statusCode)
            this.statusCode = statusCode;
        if (original)
            this.original = original;
        if (extra.exit === undefined)
            extra.exit = true;
        if (extra.source === undefined)
            extra.source = UNEXPECTED;
        this.extra = {
            exit: extra.exit,
            source: extra.source,
        };
        // name the error
        this.name = this.constructor.name;
    }
}
exports.ErrorTemplate = ErrorTemplate;
