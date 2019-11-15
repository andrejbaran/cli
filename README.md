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
@cto.ai/ops/1.5.25 darwin-x64 node-v12.12.0
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
* [`ops secrets:list`](#ops-secretslist)
* [`ops secrets:register`](#ops-secretsregister)
* [`ops secrets:set`](#ops-secretsset)
* [`ops secrets:unregister`](#ops-secretsunregister)
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

## `ops remove [OPNAME]`

Remove an Op from your team.

```
USAGE
  $ ops remove [OPNAME]

ARGUMENTS
  OPNAME  A part of the name or description of the command or workflow you want to remove.

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

_See code: [src/commands/search.ts](https://github.com/cto.ai/ops/blob/v1.5.24/src/commands/search.ts)_

## `ops secrets:list`

List all the keys that are stored for the active team

```
USAGE
  $ ops secrets:list

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/secrets/list.ts](https://github.com/cto.ai/ops/blob/v1.5.24/src/commands/secrets/list.ts)_

## `ops secrets:register`

Register a secrets provider for a team

```
USAGE
  $ ops secrets:register
```

_See code: [src/commands/secrets/register.ts](https://github.com/cto.ai/ops/blob/v1.5.24/src/commands/secrets/register.ts)_

## `ops secrets:set`

Add a key & value

```
USAGE
  $ ops secrets:set

OPTIONS
  -k, --key=key
  -v, --value=value
```

_See code: [src/commands/secrets/set.ts](https://github.com/cto.ai/ops/blob/v1.5.24/src/commands/secrets/set.ts)_

## `ops secrets:unregister`

Unregister a secrets provider for a team

```
USAGE
  $ ops secrets:unregister
```

_See code: [src/commands/secrets/unregister.ts](https://github.com/cto.ai/ops/blob/v1.5.24/src/commands/secrets/unregister.ts)_

## `ops team:create`

Create your team.

```
USAGE
  $ ops team:create

OPTIONS
  -h, --help       show CLI help
  -n, --name=name
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

## `ops team:switch`

Shows the list of your teams.

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

  1. Run `npm run configdev` to point the ops binary at the development Typescript app (instead of the production Javascript bundle)
  2. Ensure you have a `.env.test` file (you can generate one by running scripts/make-env.sh)
  3. Modify the vars in `.env.test` to match your minikube IP
  4. Set your `NODE_ENV` to 'test':  `export NODE_ENV=test`
  5. `npm run test:e2e`

### Tips

Run a single E2E test, or filter test files by filename:

    npm run test:e2e --testPathPattern=signin
