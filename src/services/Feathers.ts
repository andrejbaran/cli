/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Sunday, 28th April 2019 1:16:46 am
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Thursday, 28th November 2019 4:17:41 pm
 * @copyright (c) 2019 CTO.ai
 */

import feathers from '@feathersjs/feathers'
import rest from '@feathersjs/rest-client'
import axios from 'axios'

import * as url from 'url'

import { OPS_API_HOST, OPS_API_PATH } from '../constants/env'

export const localFeathersHost = url.resolve(OPS_API_HOST, OPS_API_PATH)

export class FeathersClient {
  feathersClient: feathers.Application

  constructor(apiUrl: string = localFeathersHost) {
    this.feathersClient = feathers().configure(rest(apiUrl).axios(axios))
  }

  async find(service: string, payload: object): Promise<any> {
    return this.feathersClient.service(service).find(payload)
  }

  async create(
    service: string,
    payload: object,
    params?: object,
  ): Promise<any> {
    return this.feathersClient.service(service).create(payload, params)
  }

  async patch(service: string, token: string, payload: object): Promise<any> {
    return this.feathersClient.service(service).patch(token, payload)
  }

  async remove(
    service: string,
    id: string | null,
    params?: object,
  ): Promise<any> {
    return this.feathersClient.service(service).remove(id, params)
  }
}
