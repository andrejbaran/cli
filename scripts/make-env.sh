#! /bin/bash

cat << EOF > .env
OPS_REGISTRY_HOST="reg.local.hc.ai"
OPS_API_HOST="http://localhost:3030"
OPS_KEYCLOAK_HOST="http://localhost:8080"
OPS_API_PATH="api/v1"
EOF

cat << EOF > .env.development
OPS_REGISTRY_HOST="reg.local.hc.ai"
OPS_API_HOST="http://localhost:3030"
OPS_KEYCLOAK_HOST="http://localhost:8080"
EOF

cat << EOF > .env.staging
OPS_REGISTRY_HOST="registry.stg-platform.hc.ai"
OPS_API_HOST="https://www.stg-platform.hc.ai/"
OPS_KEYCLOAK_HOST=""
EOF

cat << EOF > .env.production
OPS_REGISTRY_HOST="registry.cto.ai"
OPS_API_HOST="https://cto.ai/"
OPS_KEYCLOAK_HOST=""
EOF
