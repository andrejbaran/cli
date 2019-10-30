#! /bin/bash
NODE_ENV=staging npm run test:e2e

curl -v https://app.stg-platform.hc.ai/api/v1/cleanup

