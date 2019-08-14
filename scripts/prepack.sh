##
# Author: JP Lew (jp@cto.ai)
# Date: Friday, 10th May 2019 8:38:24 am
#
# Usage:
# Run this to set up your dev environment.
#
# Point your ops command from bin/ run to bin/run.dev. This will allow you to
# set your environment at run-time like this: `NODE_ENV=staging ops init`
#
# It also enables path aliases (~) in your Typescript files.
# DESCRIPTION
#
# Copyright (c) 2019 CTO.ai
##
#! /bin/bash

# start fresh
# create a ~ symlink in node_modules. tsc requires this in order to resolve path aliases.
link-module-alias

# create a new ./lib dir and populate it
rm -rf lib
tsc -b src
if [ $? -gt 0 ]
then
  exit 1

else
  echo "Compiled successfully"
fi
# search through ./lib and replace all the path aliases (~/base.ts) with relative paths (../../base.ts)
tscpaths -p src/tsconfig.json -s ./src -o ./lib 1>/dev/null

oclif-dev manifest
oclif-dev readme

mkdir lib

cp -R src/templates lib/templates
cp -R src/constants/keycloakRedirect.html lib/constants/keycloakRedirect.html
