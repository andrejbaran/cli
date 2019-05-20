/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Friday, 10th May 2019 12:10:47 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Thursday, 16th May 2019 1:36:20 pm
 * @copyright (c) 2019 CTO.ai
 */
/// <reference types="node" />
import { ChildProcess } from 'child_process';
import { ChildProcessError } from '../types';
export declare function onExit(childProcess: ChildProcess): Promise<void | ChildProcessError>;
