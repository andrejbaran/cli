import Debug from 'debug'
import axios from 'axios'
import { errorSource } from '../constants/errorSource'
import { OPS_API_HOST } from '~/constants/env'

const debug = Debug('ops:ErrorService')
const { UNEXPECTED } = errorSource

interface HandleErrorInputs {
  err
  accessToken?: string
}

export class ErrorService {
  public log = console.log
  constructor(protected api = new FeathersClient()) {}

  handleError = async (inputs: HandleErrorInputs): Promise<void> => {
    const { accessToken, err } = inputs
    if (accessToken) {
      await axios
        .post(
          `${OPS_API_HOST}analytics-service/private/events`,
          { metadata: err },
          {
            headers: {
              Authorization: accessToken,
            },
          },
        )
        .catch(err => {
          debug('%O', err)
          this.log(
            `\n 😰 We've encountered a problem. Please try again or contact support@cto.ai and we'll do our best to help. \n`,
          )
          process.exit(1)
        })
    }

    const { extra, message } = err

    if (extra && extra.source === UNEXPECTED) {
      this.log(
        `\n 😰 We've encountered a problem. Please try again or contact support@cto.ai and we'll do our best to help. \n`,
      )
      process.exit(1)
    }

    this.log(`\n ${message}`)

    if (extra && extra.exit) process.exit()
  }
}
