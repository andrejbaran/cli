/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Sunday, 28th April 2019 1:16:46 am
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Wednesday, 4th September 2019 3:08:35 pm
 * @copyright (c) 2019 CTO.ai
 */

import Analytics from 'analytics-node'
import Debug from 'debug'
import axios from 'axios'
import { OPS_API_HOST, OPS_SEGMENT_KEY, OPS_DEBUG } from '../constants/env'
const debug = Debug('ops:AnalyticsService')

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

  constructor(writeKey: string = OPS_SEGMENT_KEY) {
    this.segmentClient = new Analytics(writeKey)
  }

  /* The track method lets you record the actions your users perform. */
  track(event: string, properties: any, config: Config) {
    if (OPS_DEBUG) {
      return null
    }
    const {
      user: { email },
      team: { name: activeTeam },
      tokens: { accessToken },
    } = config
    if (email && activeTeam && accessToken) {
      axios
        .post(
          `${OPS_API_HOST}analytics-service/private/events`,
          {
            metadata: {
              userId: email,
              team: activeTeam,
              event,
              properties,
            },
            tags: ['track'],
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        )
        .catch(err => {
          debug('%O', err)
        })
    }
    return this.segmentClient.track({
      userId: email,
      team: activeTeam,
      event,
      properties,
    } as AnalyticsTrack)
  }
}
