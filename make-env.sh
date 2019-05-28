#! /bin/bash

cat << EOF > .env
OPS_REGISTRY_HOST="reg.local.hc.ai"
OPS_API_HOST="http://localhost:3030"
OPS_API_PATH="api/v1"
OPS_SEGMENT_KEY="12341234"
EOF

cat << EOF > .env.development
OPS_REGISTRY_HOST="reg.local.hc.ai"
OPS_API_HOST="http://localhost:3030"
EOF

cat << EOF > .env.staging
OPS_REGISTRY_HOST="registry.stg-platform.hc.ai"
OPS_API_HOST="https://www.stg-platform.hc.ai/"
EOF

cat << EOF > .env.production
OPS_REGISTRY_HOST="registry.cto.ai"
OPS_API_HOST="https://cto.ai/"
EOF