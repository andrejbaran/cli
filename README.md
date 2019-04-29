ops
===

💻 CTO.ai Ops - The CLI built for Teams 🚀

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/ops.svg)](https://npmjs.org/package/ops)
[![Downloads/week](https://img.shields.io/npm/dw/ops.svg)](https://npmjs.org/package/ops)
[![License](https://img.shields.io/npm/l/ops.svg)](https://github.com/cto.ai/ops/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @cto.ai/ops
$ ops COMMAND
running command...
$ ops (-v|--version|version)
@cto.ai/ops/1.0.47 darwin-x64 node-v11.14.0
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
* [`ops account:support [FILE]`](#ops-accountsupport-file)
* [`ops build [PATH]`](#ops-build-path)
* [`ops help [COMMAND]`](#ops-help-command)
* [`ops init`](#ops-init)
* [`ops publish [PATH]`](#ops-publish-path)
* [`ops remove [OPNAME]`](#ops-remove-opname)
* [`ops run [NAMEORPATH]`](#ops-run-nameorpath)
* [`ops search [FILTER]`](#ops-search-filter)
* [`ops team:create`](#ops-teamcreate)
* [`ops team:invite`](#ops-teaminvite)
* [`ops team:join`](#ops-teamjoin)
* [`ops team:switch`](#ops-teamswitch)
* [`ops update`](#ops-update)

## `ops account:reset`

Reset your password

```
USAGE
  $ ops account:reset
```

_See code: [src/commands/account/reset.ts](https://github.com/cto.ai/ops/blob/v1.0.47/src/commands/account/reset.ts)_

## `ops account:signin`

Logs in to your account

```
USAGE
  $ ops account:signin

OPTIONS
  -e, --email=email
  -h, --help               show CLI help
  -p, --password=password
```

_See code: [src/commands/account/signin.ts](https://github.com/cto.ai/ops/blob/v1.0.47/src/commands/account/signin.ts)_

## `ops account:signout`

Log out from your account

```
USAGE
  $ ops account:signout
```

_See code: [src/commands/account/signout.ts](https://github.com/cto.ai/ops/blob/v1.0.47/src/commands/account/signout.ts)_

## `ops account:signup`

Creates an account to use with ops CLI

```
USAGE
  $ ops account:signup

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/account/signup.ts](https://github.com/cto.ai/ops/blob/v1.0.47/src/commands/account/signup.ts)_

## `ops account:support [FILE]`

Contact our support team with questions.

```
USAGE
  $ ops account:support [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print
```

_See code: [src/commands/account/support.ts](https://github.com/cto.ai/ops/blob/v1.0.47/src/commands/account/support.ts)_

## `ops build [PATH]`

Build your op for sharing.

```
USAGE
  $ ops build [PATH]

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/build.ts](https://github.com/cto.ai/ops/blob/v1.0.47/src/commands/build.ts)_

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
  -d, --description=description  op description
  -h, --help                     show CLI help
  -n, --name=name                op name
```

_See code: [src/commands/init.ts](https://github.com/cto.ai/ops/blob/v1.0.47/src/commands/init.ts)_

## `ops publish [PATH]`

describe the command here

```
USAGE
  $ ops publish [PATH]

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/publish.ts](https://github.com/cto.ai/ops/blob/v1.0.47/src/commands/publish.ts)_

## `ops remove [OPNAME]`

describe the command here

```
USAGE
  $ ops remove [OPNAME]

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/remove.ts](https://github.com/cto.ai/ops/blob/v1.0.47/src/commands/remove.ts)_

## `ops run [NAMEORPATH]`

Run an op from the registry.

```
USAGE
  $ ops run [NAMEORPATH]

OPTIONS
  -h, --help  show CLI help
  --build
```

_See code: [src/commands/run.ts](https://github.com/cto.ai/ops/blob/v1.0.47/src/commands/run.ts)_

## `ops search [FILTER]`

Search for ops in the registry.

```
USAGE
  $ ops search [FILTER]

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/search.ts](https://github.com/cto.ai/ops/blob/v1.0.47/src/commands/search.ts)_

## `ops team:create`

Create your team.

```
USAGE
  $ ops team:create

OPTIONS
  -h, --help       show CLI help
  -n, --name=name
```

_See code: [src/commands/team/create.ts](https://github.com/cto.ai/ops/blob/v1.0.47/src/commands/team/create.ts)_

## `ops team:invite`

Invite your team members.

```
USAGE
  $ ops team:invite

OPTIONS
  -h, --help                         show CLI help

  -i, --inviteesInput=inviteesInput  A comma-separated string of usernames/emails we want to invite. E.g. ("user1,
                                     user2@gmail.com, user3@something")
```

_See code: [src/commands/team/invite.ts](https://github.com/cto.ai/ops/blob/v1.0.47/src/commands/team/invite.ts)_

## `ops team:join`

Accept an invite to join a team

```
USAGE
  $ ops team:join
```

_See code: [src/commands/team/join.ts](https://github.com/cto.ai/ops/blob/v1.0.47/src/commands/team/join.ts)_

## `ops team:switch`

Shows the list of your teams

```
USAGE
  $ ops team:switch

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/team/switch.ts](https://github.com/cto.ai/ops/blob/v1.0.47/src/commands/team/switch.ts)_

## `ops update`

Update the ops CLI

```
USAGE
  $ ops update

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/update.ts](https://github.com/cto.ai/ops/blob/v1.0.47/src/commands/update.ts)_
<!-- commandsstop -->
