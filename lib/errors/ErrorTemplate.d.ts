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
import { IExtra } from '../types';
/**
 * ErrorTemplate class provide a base class for customized errors
 *
 * @extends Error
 */
export declare class ErrorTemplate extends Error {
    original?: Error;
    extra: IExtra;
    statusCode?: number;
    errorCode?: string;
    /**
     * @constructor
     *
     * @param {String} [message] Error Message
     * @param {Object} [extra] Append any extra information to the error message
     * @param {Number} [statusCode] Specific for HTTP request, e.g.: 404
     * @param {String} [errorCode] Error codes, e.g.: U0010
     * @param {Error} [original] Original error object
     */
    constructor(message: string, original?: Error, extra?: IExtra, statusCode?: number, errorCode?: string);
}
