/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Sunday, 28th April 2019 1:16:46 am
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Wednesday, 4th September 2019 3:08:35 pm
 * @copyright (c) 2019 CTO.ai
 */

import Analytics from 'analytics-node'
import Debug from 'debug'
import { OPS_SEGMENT_KEY, NODE_ENV, OPS_DEBUG } from '../constants/env'
import { FeathersClient } from './Feathers'
import { ApiService } from '~/types'
const debug = Debug('ops:AnalyticsService')

interface SegmentIdentify {
  userId?: string | number
  anonymousId?: string | number
  traits?: any
  timestamp?: Date
  context?: any
  integrations?: any
}

interface AnalyticsTrack {
  userId?: string | number
  teamId?: string | number
  anonymousId?: string | number
  event: string
  cliEvent?: string
  properties?: any
  timestamp?: Date
  context?: any
  integrations?: any
}

export class AnalyticsService {
  segmentClient: Analytics
  api: ApiService

  constructor(writeKey: string = OPS_SEGMENT_KEY) {
    this.segmentClient = new Analytics(writeKey)
    this.api = new FeathersClient()
  }

  /* The track method lets you record the actions your users perform. */
  track(payload: AnalyticsTrack, accessToken?: string) {
    if (OPS_DEBUG) {
      return null
    }
    if (accessToken) {
      this.api
        .create(
          '/log/event',
          { metadata: payload, tags: ['track'] },
          {
            headers: {
              Authorization: accessToken,
            },
          },
        )
        .catch(err => {
          debug('%O', err)
        })
    }
    return this.segmentClient.track(payload)
  }
}
