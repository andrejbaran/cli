/**
 * @author: Prachi Singh (prachi@hackcapital.com)
 * @date: Wednesday, 8th May 2019 11:31:34 am
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Wednesday, 8th May 2019 3:18:00 pm
 *
 * DESCRIPTION: Errors base class test
 *
 * @copyright (c) 2019 Hack Capital
 */

import { ErrorTemplate } from '../../src/errors/base'
import { errorSource } from '../../src/constants/errorSource'

const { EXPECTED, UNEXPECTED } = errorSource

const originalError = new Error('This is an error')
const extra = {
  exit: false,
  source: EXPECTED,
}
const statusCode = 500
const errorCode = 'U100'

class ErrorWithJustMessage extends ErrorTemplate {
  constructor() {
    super('Error with just message!')
  }
}

class ErrorWithExtra extends ErrorTemplate {
  constructor() {
    super('Error with extra!', undefined, extra)
  }
}

class FullFeaturedError extends ErrorTemplate {
  constructor() {
    super('Full featured error!', originalError, extra, statusCode, errorCode)
  }
}

describe('ErrorTemplate', () => {
  describe('handles errors with just message', () => {
    try {
      throw new ErrorWithJustMessage()
    } catch (error) {
      it('should be an instance of Error', () => {
        expect(error).toBeInstanceOf(Error)
      })
      it('should be an instance of ErrorTemplate', () => {
        expect(error).toBeInstanceOf(ErrorTemplate)
      })
      it('should be an instance of the ErrorWithJustMessage error', () => {
        expect(error).toBeInstanceOf(ErrorWithJustMessage)
      })

      it('should have a name', () => {
        expect(error.name !== undefined).toBe(true)
      })
      it('should have a message', () => {
        expect(error.message).toBe('Error with just message!')
      })
      it('should have default values for extra', () => {
        expect(error.extra.exit).toBe(true)
        expect(error.extra.source).toBe(UNEXPECTED)
      })
      it('should not have a statusCode', () => {
        expect(error.statusCode).toBe(undefined)
      })
      it('should not have an error code', () => {
        expect(error.errorCode).toBe(undefined)
      })
    }
  })

  describe('handles errors with extra provided', () => {
    try {
      throw new ErrorWithExtra()
    } catch (error) {
      it('should be an instance of Error', () => {
        expect(error).toBeInstanceOf(Error)
      })
      it('should be an instance of ErrorTemplate', () => {
        expect(error).toBeInstanceOf(ErrorTemplate)
      })
      it('should be an instance of the ErrorWithExtra error', () => {
        expect(error).toBeInstanceOf(ErrorWithExtra)
      })
      it('should have a name', () => {
        expect(error.name !== undefined).toBe(true)
      })
      it('should have a message', () => {
        expect(error.message).toBe('Error with extra!')
      })
      it('should have the provided values for extra', () => {
        expect(error.extra.exit).toBe(false)
        expect(error.extra.source).toBe(EXPECTED)
      })
      it('should not have a statusCode', () => {
        expect(error.statusCode).toBe(undefined)
      })
      it('should not have a error code', () => {
        expect(error.errorCode).toBe(undefined)
      })
    }
  })

  describe('handles errors with all the parameters provided', () => {
    try {
      throw new FullFeaturedError()
    } catch (error) {
      it('should be an instance of Error', () => {
        expect(error).toBeInstanceOf(Error)
      })
      it('should be an instance of ErrorTemplate', () => {
        expect(error).toBeInstanceOf(ErrorTemplate)
      })
      it('should be an instance of the FullFeaturedError error', () => {
        expect(error).toBeInstanceOf(FullFeaturedError)
      })
      it('should have a name', () => {
        expect(error.name !== undefined).toBe(true)
      })
      it('should have a message', () => {
        expect(error.message).toBe('Full featured error!')
      })
      it('should have original error message', () => {
        expect(error).toHaveProperty('original')
        expect(error.original).toBeInstanceOf(Error)
      })
      it('should have the provided values for extra', () => {
        expect(error.extra.exit).toBe(extra.exit)
        expect(error.extra.source).toBe(extra.source)
      })
      it('should have the provided statusCode', () => {
        expect(error.statusCode).toBe(statusCode)
      })
      it('should have the provided errorCode', () => {
        expect(error.errorCode).toBe(errorCode)
      })
    }
  })
})
