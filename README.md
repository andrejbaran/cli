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
@cto.ai/ops/1.5.14 darwin-x64 node-v11.14.0
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
* [`ops build [PATH]`](#ops-build-path)
* [`ops cleanup [OPNAME]`](#ops-cleanup-opname)
* [`ops help [COMMAND]`](#ops-help-command)
* [`ops init`](#ops-init)
* [`ops list`](#ops-list)
* [`ops publish PATH`](#ops-publish-path)
* [`ops remove [OPNAME]`](#ops-remove-opname)
* [`ops run [NAMEORPATH]`](#ops-run-nameorpath)
* [`ops search [FILTER]`](#ops-search-filter)
* [`ops team:create`](#ops-teamcreate)
* [`ops team:invite`](#ops-teaminvite)
* [`ops team:join`](#ops-teamjoin)
* [`ops team:switch`](#ops-teamswitch)
* [`ops update`](#ops-update)
* [`ops whoami`](#ops-whoami)

## `ops account:reset`

Reset your password.

```
USAGE
  $ ops account:reset
```

_See code: [src/commands/account/reset.ts](https://github.com/cto.ai/ops/blob/v1.5.14/src/commands/account/reset.ts)_

## `ops account:signin`

Logs in to your account.

```
USAGE
  $ ops account:signin

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/account/signin.ts](https://github.com/cto.ai/ops/blob/v1.5.14/src/commands/account/signin.ts)_

## `ops account:signout`

Log out from your account.

```
USAGE
  $ ops account:signout

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/account/signout.ts](https://github.com/cto.ai/ops/blob/v1.5.14/src/commands/account/signout.ts)_

## `ops account:signup`

Creates an account to use with ops CLI.

```
USAGE
  $ ops account:signup

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/account/signup.ts](https://github.com/cto.ai/ops/blob/v1.5.14/src/commands/account/signup.ts)_

## `ops account:support`

Contact our support team with questions.

```
USAGE
  $ ops account:support

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/account/support.ts](https://github.com/cto.ai/ops/blob/v1.5.14/src/commands/account/support.ts)_

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

_See code: [src/commands/build.ts](https://github.com/cto.ai/ops/blob/v1.5.14/src/commands/build.ts)_

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

_See code: [src/commands/cleanup.ts](https://github.com/cto.ai/ops/blob/v1.5.14/src/commands/cleanup.ts)_

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

Easily create a new op.

```
USAGE
  $ ops init

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/init.ts](https://github.com/cto.ai/ops/blob/v1.5.14/src/commands/init.ts)_

## `ops list`

Lists the ops you have in your team

```
USAGE
  $ ops list

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/list.ts](https://github.com/cto.ai/ops/blob/v1.5.14/src/commands/list.ts)_

## `ops publish PATH`

Publish an op to a team.

```
USAGE
  $ ops publish PATH

ARGUMENTS
  PATH  Path to the op you want to publish.

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/publish.ts](https://github.com/cto.ai/ops/blob/v1.5.14/src/commands/publish.ts)_

## `ops remove [OPNAME]`

Remove an op from a team.

```
USAGE
  $ ops remove [OPNAME]

ARGUMENTS
  OPNAME  A part of the name or description of the op or workflow you want to remove.

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/remove.ts](https://github.com/cto.ai/ops/blob/v1.5.14/src/commands/remove.ts)_

## `ops run [NAMEORPATH]`

Run an op from the registry.

```
USAGE
  $ ops run [NAMEORPATH]

ARGUMENTS
  NAMEORPATH  Name or path of the op or workflow you want to run.

OPTIONS
  -b, --build  Builds the op before running. Must provide a path to the op.
  -h, --help   show CLI help
```

_See code: [src/commands/run.ts](https://github.com/cto.ai/ops/blob/v1.5.14/src/commands/run.ts)_

## `ops search [FILTER]`

Search for ops in your workspaces.

```
USAGE
  $ ops search [FILTER]

ARGUMENTS
  FILTER  Filters op results which include filter text in op name or description.

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/search.ts](https://github.com/cto.ai/ops/blob/v1.5.14/src/commands/search.ts)_

## `ops team:create`

Create your team.

```
USAGE
  $ ops team:create

OPTIONS
  -h, --help       show CLI help
  -n, --name=name
```

_See code: [src/commands/team/create.ts](https://github.com/cto.ai/ops/blob/v1.5.14/src/commands/team/create.ts)_

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

_See code: [src/commands/team/invite.ts](https://github.com/cto.ai/ops/blob/v1.5.14/src/commands/team/invite.ts)_

## `ops team:join`

Accept an invite to join a team.

```
USAGE
  $ ops team:join
```

_See code: [src/commands/team/join.ts](https://github.com/cto.ai/ops/blob/v1.5.14/src/commands/team/join.ts)_

## `ops team:switch`

Shows the list of your teams.

```
USAGE
  $ ops team:switch

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/team/switch.ts](https://github.com/cto.ai/ops/blob/v1.5.14/src/commands/team/switch.ts)_

## `ops update`

Update the ops CLI.

```
USAGE
  $ ops update

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/update.ts](https://github.com/cto.ai/ops/blob/v1.5.14/src/commands/update.ts)_

## `ops whoami`

Display your user information

```
USAGE
  $ ops whoami

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/whoami.ts](https://github.com/cto.ai/ops/blob/v1.5.14/src/commands/whoami.ts)_
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

  1. Run `npm run configdev` to point the ops binary at the development Typescript app (instead of the production Javascript bundle)
  2. Ensure you have a `.env.test` file (you can generate one by running scripts/make-env.sh)
  3. Modify the vars in `.env.test` to match your minikube IP
  4. Set your `NODE_ENV` to 'test':  `export NODE_ENV=test`
  5. `npm run test:e2e`

### Tips

Run a single E2E test, or filter test files by filename:

    npm run test:e2e -- --testPathPattern=signin
