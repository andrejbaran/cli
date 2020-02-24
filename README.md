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
@cto.ai/ops/1.6.18 darwin-x64 node-v11.14.0
$ ops --help [COMMAND]
USAGE
  $ ops COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`ops account:reset`](#ops-accountreset)
* [`ops account:signin`](#ops-accountsignin)
* [`ops account:signout`](#ops-accountsignout)
* [`ops account:signup`](#ops-accountsignup)
* [`ops account:support`](#ops-accountsupport)
* [`ops add [OPNAME]`](#ops-add-opname)
* [`ops build [PATH]`](#ops-build-path)
* [`ops cleanup [OPNAME]`](#ops-cleanup-opname)
* [`ops help [COMMAND]`](#ops-help-command)
* [`ops init`](#ops-init)
* [`ops list`](#ops-list)
* [`ops publish PATH`](#ops-publish-path)
* [`ops remove OP`](#ops-remove-op)
* [`ops run [NAMEORPATH]`](#ops-run-nameorpath)
* [`ops search [FILTER]`](#ops-search-filter)
* [`ops secrets:delete`](#ops-secretsdelete)
* [`ops secrets:list`](#ops-secretslist)
* [`ops secrets:register`](#ops-secretsregister)
* [`ops secrets:set`](#ops-secretsset)
* [`ops secrets:unregister`](#ops-secretsunregister)
* [`ops team:create`](#ops-teamcreate)
* [`ops team:info`](#ops-teaminfo)
* [`ops team:invite`](#ops-teaminvite)
* [`ops team:join`](#ops-teamjoin)
* [`ops team:list`](#ops-teamlist)
* [`ops team:remove [MEMBER]`](#ops-teamremove-member)
* [`ops team:switch`](#ops-teamswitch)
* [`ops update`](#ops-update)
* [`ops whoami`](#ops-whoami)

## `ops account:reset`

Reset your password.

```
USAGE
  $ ops account:reset
```

## `ops account:signin`

Log in to your account.

```
USAGE
  $ ops account:signin

OPTIONS
  -h, --help  show CLI help
```

## `ops account:signout`

Log out from your account.

```
USAGE
  $ ops account:signout

OPTIONS
  -h, --help  show CLI help
```

## `ops account:signup`

Creates an account to use with ops CLI.

```
USAGE
  $ ops account:signup

OPTIONS
  -h, --help  show CLI help
```

## `ops account:support`

Contact our support team with questions.

```
USAGE
  $ ops account:support

OPTIONS
  -h, --help  show CLI help
```

## `ops add [OPNAME]`

Add an op to your team.

```
USAGE
  $ ops add [OPNAME]

ARGUMENTS
  OPNAME  Name of the public op to be added to your team. It should be of the format - @teamname/opName:versionName

OPTIONS
  -h, --help  show CLI help
```

## `ops build [PATH]`

Build your op for sharing.

```
USAGE
  $ ops build [PATH]

ARGUMENTS
  PATH  Path to the op you want to build.

OPTIONS
  -h, --help  show CLI help
```

## `ops cleanup [OPNAME]`

Clean up locally cached docker images.

```
USAGE
  $ ops cleanup [OPNAME]

ARGUMENTS
  OPNAME  Name of the op to be cleaned up

OPTIONS
  -h, --help  show CLI help
```

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

## `ops init`

Easily create a new Op.

```
USAGE
  $ ops init

OPTIONS
  -h, --help  show CLI help
```

## `ops list`

Lists the Ops you have in your team.

```
USAGE
  $ ops list

OPTIONS
  -h, --help  show CLI help
```

## `ops publish PATH`

Publish an Op to your team.

```
USAGE
  $ ops publish PATH

ARGUMENTS
  PATH  Path to the op you want to publish.

OPTIONS
  -h, --help  show CLI help
```

## `ops remove OP`

Remove an Op from your team.

```
USAGE
  $ ops remove OP

ARGUMENTS
  OP  The name and version of the command or workflow you want to remove. E.g. my-command:0.1.0

OPTIONS
  -h, --help  show CLI help
```

## `ops run [NAMEORPATH]`

Run an Op from your team or the registry.

```
USAGE
  $ ops run [NAMEORPATH]

ARGUMENTS
  NAMEORPATH  Name or path of the command or workflow you want to run.

OPTIONS
  -b, --build  Builds the op before running. Must provide a path to the op.
  -h, --help   show CLI help
```

## `ops search [FILTER]`

Search for ops in your workspaces.

```
USAGE
  $ ops search [FILTER]

ARGUMENTS
  FILTER  Filters Op results which include filter text in Op name or description.

OPTIONS
  -h, --help  show CLI help
```

## `ops secrets:delete`

Delete a secret stored for the active team

```
USAGE
  $ ops secrets:delete

OPTIONS
  -h, --help     show CLI help
  -k, --key=key  Secret Key Name
```

## `ops secrets:list`

List all the keys that are stored for the active team

```
USAGE
  $ ops secrets:list

OPTIONS
  -h, --help  show CLI help
```

## `ops secrets:register`

Register a secrets provider for a team

```
USAGE
  $ ops secrets:register
```

## `ops secrets:set`

Add a key & value

```
USAGE
  $ ops secrets:set

OPTIONS
  -k, --key=key
  -v, --value=value
```

## `ops secrets:unregister`

Unregister a secrets provider for a team

```
USAGE
  $ ops secrets:unregister
```

## `ops team:create`

Create your team.

```
USAGE
  $ ops team:create

OPTIONS
  -h, --help       show CLI help
  -n, --name=name
```

## `ops team:info`

Shows basic team information for the team you are currently on.

```
USAGE
  $ ops team:info

OPTIONS
  -h, --help  show CLI help
```

## `ops team:invite`

Invite your team members.

```
USAGE
  $ ops team:invite

OPTIONS
  -h, --help               show CLI help

  -i, --invitees=invitees  A comma-separated string of usernames/emails we want to invite. E.g. ("user1,
                           user2@gmail.com, user3@something")
```

## `ops team:join`

Accept an invite to join a team.

```
USAGE
  $ ops team:join
```

## `ops team:list`

Shows the list of your teams.

```
USAGE
  $ ops team:list

OPTIONS
  -h, --help  show CLI help
```

## `ops team:remove [MEMBER]`

Remove your team members.

```
USAGE
  $ ops team:remove [MEMBER]

ARGUMENTS
  MEMBER  The username of the team member you want to remove from the team.

OPTIONS
  -h, --help  show CLI help
```

## `ops team:switch`

Switch your currently active team.

```
USAGE
  $ ops team:switch

OPTIONS
  -h, --help  show CLI help
```

## `ops update`

Update the Ops CLI.

```
USAGE
  $ ops update

OPTIONS
  -h, --help  show CLI help
```

## `ops whoami`

Display your user information

```
USAGE
  $ ops whoami

OPTIONS
  -h, --help  show CLI help
```
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
