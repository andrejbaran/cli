/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Sunday, 28th April 2019 1:16:46 am
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Wednesday, 1st May 2019 3:54:20 pm
 * @copyright (c) 2019 CTO.ai
 */

import { FeathersClient } from './feathers'
import { fakeToken } from '../constants/test'

export class MockGoodApiService extends FeathersClient {
  async get(): Promise<any> {
    return Promise.resolve({
      data: fakeToken,
      error: null,
    })
  }

  async find(service: string, payload: object): Promise<any> {
    return Promise.resolve({
      data: { fakeData: 'fakeData' },
      error: null,
    })
  }
}
