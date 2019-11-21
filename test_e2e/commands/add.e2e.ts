/**
 * @author: Prachi Singh (prachi@hackcapital.com)
 * @date: Thursday, 14th November 2019 4:40:47 pm
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Friday, 15th November 2019 4:43:47 pm
 *
 * DESCRIPTION: E2E tests for ops add
 *
 * @copyright (c) 2019 Hack Capital
 */

import { run, signin, sleep, cleanupAddedOp, cleanup } from '../utils/cmd'
import {
  ENTER,
  PUBLIC_OP_NAME_WITH_TEAM,
  PUBLIC_OP_NAME_WITH_TEAM_AND_VERSION,
} from '../utils/constants'

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 3

beforeEach(async () => {
  try {
    await run(['account:signout'])
  } catch (err) {
    throw err
  }
})

afterAll(async () => {
  await cleanup()
  // avoid jest open handle error
  await sleep(500)
})

test('it should ops add with op name (including version name) provided as an argument', async () => {
  await signin()
  await sleep(500)

  console.log(`ops add ${PUBLIC_OP_NAME_WITH_TEAM_AND_VERSION}`)

  const result = await run(['add', PUBLIC_OP_NAME_WITH_TEAM_AND_VERSION])
  expect(result).toContain(
    `Good job! ${PUBLIC_OP_NAME_WITH_TEAM_AND_VERSION} has been successfully added to your team.`,
  )

  await cleanupAddedOp(PUBLIC_OP_NAME_WITH_TEAM_AND_VERSION)
})

test('it should ops add with op name (excluding version name) provided as an argument', async () => {
  await signin()
  await sleep(500)

  console.log(`ops add ${PUBLIC_OP_NAME_WITH_TEAM}`)

  const result = await run(['add', PUBLIC_OP_NAME_WITH_TEAM])
  expect(result).toContain(
    `Good job! ${PUBLIC_OP_NAME_WITH_TEAM} has been successfully added to your team.`,
  )

  await cleanupAddedOp(PUBLIC_OP_NAME_WITH_TEAM)
})

test('it should ops add with op name provided in a prompt', async () => {
  await signin()
  await sleep(500)

  console.log(`ops add`)

  const result = await run(['add'], [PUBLIC_OP_NAME_WITH_TEAM])
  expect(result).toContain(
    `Good job! ${PUBLIC_OP_NAME_WITH_TEAM} has been successfully added to your team.`,
  )

  await cleanupAddedOp(PUBLIC_OP_NAME_WITH_TEAM)
})

test('it should not add an op that is already added', async () => {
  await signin()
  await sleep(500)

  console.log(`ops add ${PUBLIC_OP_NAME_WITH_TEAM_AND_VERSION}`)

  const res = await run(['add', PUBLIC_OP_NAME_WITH_TEAM_AND_VERSION])
  expect(res).toContain(`successfully added to your team.`)

  await sleep(500)

  console.log(`ops add ${PUBLIC_OP_NAME_WITH_TEAM_AND_VERSION}`)

  const result = await run(['add', PUBLIC_OP_NAME_WITH_TEAM_AND_VERSION])
  expect(result).toContain(
    `That's odd. It seems like you are trying to add an op that's already added to your team.`,
  )

  await cleanupAddedOp(PUBLIC_OP_NAME_WITH_TEAM_AND_VERSION)
})

test('it should ops add selecting op from the list of public ops', async () => {
  await signin()
  await sleep(500)

  console.log(`ops add`)

  const result = await run(['add'], [ENTER, ENTER])
  expect(result).toContain(`successfully added to your team.`)
})
