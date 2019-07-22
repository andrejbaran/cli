/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Sunday, 28th April 2019 1:16:46 am
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Thursday, 6th June 2019 6:30:19 pm
 * @copyright (c) 2019 CTO.ai
 */

import Analytics from 'analytics-node'
import { OPS_SEGMENT_KEY, NODE_ENV, OPS_DEBUG } from '../constants/env'

interface SegmentIdentify {
  userId?: string | number
  anonymousId?: string | number
  traits?: any
  timestamp?: Date
  context?: any
  integrations?: any
}

interface SegmentTrack {
  userId?: string | number
  anonymousId?: string | number
  event: string
  properties?: any
  timestamp?: Date
  context?: any
  integrations?: any
}

export class SegmentClient {
  segmentClient: Analytics

  constructor(writeKey: string = OPS_SEGMENT_KEY) {
    this.segmentClient = new Analytics(writeKey)
  }

  /* The identify method lets you tie a user to their actions and record traits about them. */
  identify(payload: SegmentIdentify) {
    if (OPS_DEBUG) {
      return null
    }
    return this.segmentClient.identify(payload)
  }

  /* The track method lets you record the actions your users perform. */
  track(payload: SegmentTrack) {
    if (OPS_DEBUG) {
      return null
    }
    return this.segmentClient.track(payload)
  }
}
