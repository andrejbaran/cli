"use strict";
/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Friday, 26th April 2019 4:03:30 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Monday, 29th April 2019 9:59:13 am
 * @copyright (c) 2019 CTO.ai
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOpUrl = (registryHost, opImageTag) => {
    const host = registryHost.replace(/https:\/\//, '');
    return `${host}/${opImageTag}`;
};
// opIdentifier is either the op.name for buils or op.id for published ops
exports.getOpImageTag = (teamName, opIdentifier, tag = 'latest') => {
    return `${teamName}/${opIdentifier}:${tag}`;
};
