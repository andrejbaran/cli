#! /bin/bash

cat << EOF > .env
OPS_REGISTRY_HOST="reg.local.hc.ai"
OPS_API_HOST="http://localhost:3030"
OPS_KEYCLOAK_HOST="http://localhost:8080"
OPS_API_PATH="api/v1"
EOF

cat << EOF > .env.development
OPS_REGISTRY_HOST="reg.local.hc.ai"
OPS_API_HOST="http://reg.local.hc.ai"
OPS_KEYCLOAK_HOST="http://uaa.local.hc.ai:8888/auth"
OPS_CLIENT_SECRET="29fb78ce-486c-4606-a75a-fb4928a84a37"
EOF

cat << EOF > .env.staging
OPS_REGISTRY_HOST="registry.stg-platform.hc.ai"
OPS_API_HOST="https://www.stg-platform.hc.ai/"
OPS_KEYCLOAK_HOST="https://www.stg-platform.hc.ai/auth"
OPS_CLIENT_SECRET="29fb78ce-486c-4606-a75a-fb4928a84a37"
EOF

cat << EOF > .env.production
OPS_REGISTRY_HOST="registry.cto.ai"
OPS_API_HOST="https://cto.ai/"
OPS_KEYCLOAK_HOST="https://cto.ai/auth"
EOF

cat << EOF > .env.test
OPS_REGISTRY_HOST="reg.local.hc.ai"
OPS_API_HOST="http://192.168.64.9:31184"
OPS_KEYCLOAK_HOST="http://uaa.local.hc.ai:8888/auth"
OPS_GO_API_HOST="http://192.168.64.9:31184"
OPS_CLIENT_SECRET="07918e06-1981-4411-b2ec-47f04382f2a7"
EOF
