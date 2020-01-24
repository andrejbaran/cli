# ops

💻 CTO.ai Ops - The CLI built for Teams 🚀

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/ops.svg)](https://npmjs.org/package/ops)
[![Downloads/week](https://img.shields.io/npm/dw/ops.svg)](https://npmjs.org/package/ops)
[![License](https://img.shields.io/npm/l/ops.svg)](https://github.com/cto.ai/ops/blob/master/package.json)

<!-- toc -->
* [ops](#ops)
* [Usage](#usage)
* [Commands](#commands)
* [Testing](#testing)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g @cto.ai/ops
$ ops COMMAND
running command...
$ ops (-v|--version|version)
@cto.ai/ops/1.6.8 darwin-x64 node-v11.14.0
$ ops --help [COMMAND]
USAGE
  $ ops COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`ops help [COMMAND]`](#ops-help-command)

## `ops help [COMMAND]`

display help for ops

```
USAGE
  $ ops help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.1.6/src/commands/help.ts)_
<!-- commandsstop -->



### OClif Source Repo

Useful reference for writing tests:

 * https://github.com/oclif/command/blob/master/src/command.ts
 * https://github.com/oclif/config/blob/master/src/plugin.ts


# Testing

Isolate tests (run only specific tests in that file):

    test.only('it should run only tests suffixed with .only', async () => {

## Unit Tests (`test` directory)

### How to run Unit Tests

  1. `npm test` or `npm t`

### Tips

Run a single unit test, or filter them by filename:

    npx jest --testPathPattern=keycloak

## E2E Tests (`test_e2e` directory)

These are known as "cli-acceptance-tests" in Concourse: https://concourse.stg-platform.hc.ai/teams/main/pipelines/ci/jobs/cli-acceptance/

### How to run E2E tests locally

The default test server is staging, but you can override this by passing in your own `OPS_REGISTRY_HOST` and `OPS_API_HOST` values from your shell config.

Run tests against staging:

  1. Run `npm run configdev` to point the ops binary at the development Typescript app (instead of the production Javascript bundle)
  2. Ensure you have a `.env.staging` file (you can generate one by running scripts/make-env.sh)
  3. Set your `NODE_ENV` to 'staging':  `export NODE_ENV=staging`
  4. `npm run test:e2e`

Run tests against Minikube:

  1. Create a user in Keycloak with the following credentials:

```
- username: 'existing_user'
- email: 'e2e_existing_user1@cto.ai'
- password: 'password'
```

  2. Change the userID in `test_e2e/utils/constants.ts EXISTING_USER_ID` to Step 1's userID
  3. Create `existing_user` team in Database if haven't already
  4. Change the teamID in `teste2e/utils/constants.ts EXISTING_TEAM_ID` to step 3's teamID
  5. Create a `cto.ai` team in Database if haven't already
  6. Publish this following command:

```
- Team: ‘cto.ai’
- name: ‘github’
- version: ‘latest’
- public: true
```

  7. Publish the `write_a_file_op` command found in `test_e2e/sample_ops/write_a_file_op`
  8. Publish the `echo_message_workflow` workflow found in `test_e2e/sample_ops/echo_message_workflow`
  9. Add the `ops-cli-confidential` client to Keycloak. The `ops-cli-confidential.json` file can be found in Keybase
  10. Run `npm run configdev` to point the ops binary at the development Typescript app (instead of the production Javascript bundle)
  11. Ensure you have a `.env.test` file (you can generate one by running scripts/make-env.sh)
  12. Modify the vars in `.env.test` to match your minikube IP
  13. Update `OPS_CLIENT_SECRET` in the `.env.test` to be the `secret value` found under the `credentials` tab in the `ops-cli-confidential` client
  14. Set your `NODE_ENV` to 'test':  `export NODE_ENV=test`
  15. `npm run test:e2e`

### Tips

Run a single E2E test, or filter test files by filename:

    npm run test:e2e --testPathPattern=signin
