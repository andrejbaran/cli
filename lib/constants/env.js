"use strict";
/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Sunday, 28th April 2019 2:54:44 am
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Monday, 13th May 2019 1:45:22 pm
 * @copyright (c) 2019 CTO.ai
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultApiHost = 'https://cto.ai/';
exports.OPS_API_HOST = process.env.OPS_API_HOST || exports.defaultApiHost;
exports.OPS_API_PATH = process.env.OPS_API_PATH || 'api/v1';
exports.OPS_SEGMENT_KEY = process.env.OPS_SEGMENT_KEY || 'sRsuG18Rh9IHgr9bK7GsrB7BfLfNmhCG';
exports.OPS_REGISTRY_HOST = process.env.OPS_REGISTRY_HOST || 'registry.cto.ai';
exports.NODE_ENV = process.env.NODE_ENV || 'production';
exports.DEBUG = process.env.DEBUG || 0;
exports.HOME = process.env.HOME || '~';
exports.INTERCOM_EMAIL = process.env.INTERCOM_EMAIL || 'h1gw0mit@ctoai.intercom-mail.com';
exports.DOCKER_SOCKET = process.env.DOCKER_SOCKET || '/var/run/docker.sock';
exports.SEGMENT_URL = process.env.SEGMENT_URL || 'https://api.segment.io';
