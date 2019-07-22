/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Sunday, 28th April 2019 1:16:46 am
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Thursday, 2nd May 2019 4:31:09 pm
 * @copyright (c) 2019 CTO.ai
 */

import { FeathersClient } from './Feathers'

export class MockBadApiService extends FeathersClient {
  async get(): Promise<any> {
    return Promise.reject('broken!')
  }

  async find(): Promise<any> {
    return Promise.reject('broken!')
  }
}
