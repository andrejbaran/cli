const expect = require('chai').expect
const cmd = require('./cmd')
const { EOL } = require('os')

const OPS_INIT_NAME = 'ci-test-op'

describe('CLI', () => {
  let opsProcess = cmd.create('/usr/local/bin/ops')

  // beforeEach(async () => {
  //   let signOutResp = ''
  //   try {
  //     signOutResp = await opsProcess.execute(['account:signout'])
  //   } catch (e) {
  //     console.log('ERROR BEFORE-EACH', e)
  //   }
  // })

  it('should signout, create acount, signin new accout', async () => {
    let randStr = Math.random()
      .toString(36)
      .slice(-8)
    let randEmail = 't_email_' + randStr + '@gmail.com'
    let randUser = 't_user_' + randStr
    let randPass = randStr

    // OPS SIGN UP
    let signUpResp = ''
    try {
      signUpResp = await opsProcess.execute(
        ['account:signup'],
        [
          randEmail,
          cmd.ENTER,
          randUser,
          cmd.ENTER,
          randPass,
          cmd.ENTER,
          randPass,
          cmd.ENTER,
        ],
      )
    } catch (e) {
      console.log('ERROR ONE', e)
    }

    await sleep(5000)

    //OPS SIGNIN
    console.log('signin in')
    let signInResp = ''
    try {
      signInResp = await opsProcess.execute(
        ['account:signin'],
        [randEmail, cmd.ENTER, randPass, cmd.ENTER],
      )
    } catch (e) {
      console.log('ERROR TWO', e)
    }

    await sleep(2000)

    console.log(signInResp)

    let teamSwitchResp = ''
    try {
      teamSwitchResp = await opsProcess.execute(['team:switch'], [])
    } catch (e) {
      console.log('ERROR THREE', e)
    }

    await sleep(2000)

    expect(teamSwitchResp).contains(randUser)
  })

  it('should signin, ops init', async () => {
    //OPS SIGNIN
    console.log('signin in')
    let signInResp = ''
    try {
      signInResp = await opsProcess.execute(
        ['account:signin'],
        ['stevehiehn@gmail.com', cmd.ENTER, 'capital123', cmd.ENTER],
      )
    } catch (e) {
      console.log('ERROR ONE', e)
    }

    await sleep(3000)

    //OPS INIT
    console.log('init the op')
    let opInitResp = ''
    try {
      opInitResp = await opsProcess.execute(
        ['init'],
        [
          cmd.DOWN,
          cmd.ENTER,
          OPS_INIT_NAME,
          cmd.ENTER,
          'op description',
          cmd.ENTER,
        ],
      )
    } catch (e) {
      console.log('ERROR ONE', e)
    }

    expect(opInitResp).contains('Now test your op with')

    await sleep(2000)

    console.log('about to build the op')

    //OPS RUN
    let opBuildResp = ''
    try {
      opBuildResp = await opsProcess.execute(['build', 'ci-test-op'], [])
    } catch (e) {
      console.log('ERROR TWO', e)
    }

    await sleep(10000)

    console.log('done waiting')

    console.log(opBuildResp)

    expect(opBuildResp).contains('to share your op')
  })
})

const sleep = milliseconds => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

/*
  Email: stevehiehn@gmail.com
  User: ci
  Password: capital123
*/

/*
  PUBLISH
  - signin
  - build op
  - pushlish
  - assert its in the search team

  CREATE TEAM/SWITCH TEAM/ TEAM REMOVE
  - signin
  - create team
  - switch team
  - assert that team exists

  INIT
  - signin
  - init
  - check that directory exisits

  RUN (edit)
  - signin
  - init an op
  - build the op (can be skipped if we use `ops run ${path} --build`
  - run
  - make sure the op runs (edited)
*/
