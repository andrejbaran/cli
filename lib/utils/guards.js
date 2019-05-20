"use strict";
/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Monday, 29th April 2019 5:55:21 pm
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Friday, 3rd May 2019 4:57:23 pm
 * @copyright (c) 2019 CTO.ai
 */
Object.defineProperty(exports, "__esModule", { value: true });
const customErrors_1 = require("../errors/customErrors");
exports.handleUndefined = (undefinedParam) => {
    throw new customErrors_1.UndefinedParameter(undefinedParam);
};
exports.handleMandatory = (paramName) => {
    throw new customErrors_1.MandatoryParameter(paramName);
};
