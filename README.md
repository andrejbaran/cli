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
@cto.ai/ops/1.0.35 darwin-x64 node-v11.9.0
$ ops --help [COMMAND]
USAGE
  $ ops COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`ops account:signin`](#ops-accountsignin)
* [`ops account:signup`](#ops-accountsignup)
* [`ops account:support [FILE]`](#ops-accountsupport-file)
* [`ops build [PATH]`](#ops-build-path)
* [`ops help [COMMAND]`](#ops-help-command)
* [`ops init`](#ops-init)
* [`ops publish [PATH]`](#ops-publish-path)
* [`ops remove [OP]`](#ops-remove-op)
* [`ops run [NAME]`](#ops-run-name)
* [`ops search [FILTER]`](#ops-search-filter)

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

_See code: [src/commands/account/signin.ts](https://github.com/cto.ai/ops/blob/v1.0.35/src/commands/account/signin.ts)_

## `ops account:signup`

Creates an account to use with ops CLI

```
USAGE
  $ ops account:signup

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/account/signup.ts](https://github.com/cto.ai/ops/blob/v1.0.35/src/commands/account/signup.ts)_

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

_See code: [src/commands/account/support.ts](https://github.com/cto.ai/ops/blob/v1.0.35/src/commands/account/support.ts)_

## `ops build [PATH]`

Build your op for sharing.

```
USAGE
  $ ops build [PATH]

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/build.ts](https://github.com/cto.ai/ops/blob/v1.0.35/src/commands/build.ts)_

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
  -h, --help       show CLI help
  -n, --name=name  op name
```

_See code: [src/commands/init.ts](https://github.com/cto.ai/ops/blob/v1.0.35/src/commands/init.ts)_

## `ops publish [PATH]`

describe the command here

```
USAGE
  $ ops publish [PATH]

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/publish.ts](https://github.com/cto.ai/ops/blob/v1.0.35/src/commands/publish.ts)_

## `ops remove [OP]`

describe the command here

```
USAGE
  $ ops remove [OP]

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/remove.ts](https://github.com/cto.ai/ops/blob/v1.0.35/src/commands/remove.ts)_

## `ops run [NAME]`

Run an op from the registry.

```
USAGE
  $ ops run [NAME]

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/run.ts](https://github.com/cto.ai/ops/blob/v1.0.35/src/commands/run.ts)_

## `ops search [FILTER]`

Search for ops in the registry.

```
USAGE
  $ ops search [FILTER]

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/search.ts](https://github.com/cto.ai/ops/blob/v1.0.35/src/commands/search.ts)_
<!-- commandsstop -->
