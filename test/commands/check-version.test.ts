import {expect, test} from '@oclif/test'

describe('hooks', () => {
  test
    .stdout()
    .hook('init', {id: 'update'})
    .do(output => expect(output.stdout).to.contain(''))
})
