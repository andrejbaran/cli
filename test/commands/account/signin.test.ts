/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Wednesday, 24th April 2019 4:29:42 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Monday, 6th May 2019 1:34:04 pm
 * @copyright (c) 2019 CTO.ai
 */

// import { ux } from '@cto.ai/sdk'
import { test } from '@oclif/test'
import * as Config from '@oclif/config'
import { expect } from 'chai'

import { clearConfig, readConfig } from '../../helpers/manage-config'

import AccountSignin from '~/commands/account/signin'

import { MockGoodApiService } from '~/services/mockGoodApi'

import { MockBadApiService } from '~/services/mockBadApi'

import { fakeToken } from '~/constants/test'

// import { SEGMENT_URL } from '../../../src/constants/env'

// TO-DO: restore tests
describe('account:signin', () => {
  const email = 'test@test.com'
  const password = 'password123'

  let signin: AccountSignin
  let signinBad: AccountSignin

  before(async () => {
    // reference https://github.com/oclif/command/blob/master/src/command.ts
    // https://github.com/oclif/config/blob/master/src/plugin.ts

    const config = await Config.load()
    signin = new AccountSignin([], config, new MockGoodApiService())
    signinBad = new AccountSignin([], config, new MockBadApiService())
  })

  afterEach(async () => {
    await clearConfig()
  })

  test
    .do(async () => {
      const credentials = {
        email,
        password,
      }
      // @ts-ignore
      const res = await signin.authenticateUser({ credentials })
      const expectation = {
        accessToken: fakeToken,
        credentials,
      }
      expect(res).eqls(expectation)
    })
    .it('returns an access token after authenticating successfully')

  test
    .do(async () => {
      const credentials = {
        email: 'test@test.com',
        password: 'password123',
      }

      // check whether an error was thrown from an async function
      // from https: github.com/chaijs/chai/issues/882#issuecomment-322131680
      // @ts-ignore
      return signinBad.authenticateUser({ credentials }).catch(err =>
        expect(err)
          .to.be.an('error')
          .with.property('message', 'broken!'),
      )

      // check error thrown from sync function
      // const badFn = () => {
      //   throw new Error('Illegal salmon!')
      // }

      // expect(badFn).to.throw()
    })
    .it('throws an error if call to api is unsuccessful')

  test
    .do(async () => {
      const expectation =
        "Cannot destructure property `credentials` of 'undefined' or 'null'."

      // @ts-ignore
      return signin.authenticateUser(null).catch(err =>
        expect(err)
          .to.be.an('error')
          .with.property('message', expectation),
      )
    })
    .it('throws an error if no args passed')

  test
    .do(async () => {
      const expectation = 'credentials'

      // @ts-ignore
      return signin.authenticateUser({ accessToken: 'abc123' }).catch(err => {
        expect(err).to.be.an('error')
      })
    })
    .it('throws an error if no credentials property exists in passed args')

  test
    .do(async () => {
      const expectation = 'invalid user credentials'

      // @ts-ignore
      return signin.authenticateUser({ credentials: {} }).catch(err =>
        expect(err)
          .to.be.an('error')
          .with.property('message', expectation),
      )
    })
    .it('throws an error if credentials object is empty')

  test
    .do(async () => {
      const credentials = {
        email: 'test@test.com',
      }
      const expectation = 'invalid user credentials'

      // @ts-ignore
      return signin.authenticateUser({ credentials }).catch(err =>
        expect(err)
          .to.be.an('error')
          .with.property('message', expectation),
      )
    })
    .it('throws an error if password not provided')

  // test
  //   .do(async () => {
  //     const flags = { email: 'jp@cto.ai' }
  //     const answers = { password: 'newPassword' }
  //     const expectation = { ...flags, ...answers }

  //     const myUserCredentialsFn = signin.determineUserCredentials(flags)
  //     const result = myUserCredentialsFn(answers)
  //     expect(result).eqls(expectation)
  //   })
  //   .it('merges a user object based on original input and new input')

  // test
  //   .do(async () => {
  //     const flags = { email: 'jp@cto.ai' }
  //     const answers = { password: 'newPassword' }
  //     const expectation = { ...flags, ...answers }
  //     const ctx = {
  //       log: (msg: string) => {
  //         console.log(msg)
  //       },
  //       ux: (msg: string) => {
  //         console.log(msg)
  //       },
  //     }

  //     const result = signin.askQuestions(ctx)(answers)
  //     expect(result).eqls(expectation)
  //   })
  //   .it('asks the right questions')

  // .it('should run function', async ctx => {
  //   const mySignIn = new AccountSignIn(['emaik', 'pask'], { name: 'bob' })
  //   mySignIn.addUp(1, 2)
  //   console.log(typeof AccountSignIn)
  //   // newAccountSignIn().logMessages()
  // })

  // baseTest
  //   .nock(SEGMENT_URL, api => api.post(() => true).reply(200))
  //   .nock(apiUrl, api =>
  //     api.post('/login').reply(200, {
  //       user: { username, email },
  //     }),
  //   )
  //   .stdout()
  //   .stub(ux, 'spinner.start', () => {})
  //   .stub(ux, 'spinner.stop', () => {})
  //   .command(['account:signin', `-e ${email}`, `-p ${password}`])
  //   .it('should go straight to signin', async ctx => {
  //     const config = await readConfig()
  //     expect(ctx.stdout).to.not.contain('Please login to get started.')
  //     expect(ctx.stdout).to.contain(`👋 Welcome back ${username}!`)
  //     expect(config.user.username).to.equal(username)
  //     expect(config.user.email).to.equal(email)
  //   })

  // baseTest
  //   .nock(SEGMENT_URL, api => api.post(uri => true).reply(200))
  //   .nock(apiUrl, api =>
  //     api.post('/auth').reply(200, {
  //       user: { username, email },
  //     }),
  //   )
  //   .stdout()
  //   .stub(ux, 'spinner.start', () => {})
  //   .stub(ux, 'spinner.stop', () => {})
  //   .stub(ux, 'prompt', () => {
  //     return { email, password: 'password' }
  //   })
  //   .command(['account:signin'])
  //   .it('should prompt for email and password', async ctx => {
  //     const config = await readConfig()
  //     expect(ctx.stdout).to.contain('Please login to get started.')
  //     expect(config.user.username).to.equal(username)
  //     expect(config.user.email).to.equal(email)
  //   })
})
