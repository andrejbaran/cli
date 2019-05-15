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


CLI_DIR="$( cd "$(dirname "$0")" ; cd .. ; pwd -P )"

if [ -f ~/.nvm/versions/node/v11.14.0/bin/ops ]; then
    rm ~/.nvm/versions/node/v11.14.0/bin/ops 
fi

if [ -f /usr/local/bin/ops  ]; then
    rm /usr/local/bin/ops 
fi

ln -s $CLI_DIR/bin/run.dev /usr/local/bin/ops 

tsc -b src

link-module-alias

export DEBUG=1
