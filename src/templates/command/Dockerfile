############################
# Build container
############################
FROM node:12-stretch-slim AS dep

WORKDIR /ops

RUN apk add python make
ADD package.json .
RUN npm install

ADD . .

############################
# Final container
############################
FROM registry.cto.ai/official_images/node:latest

WORKDIR /ops

COPY --from=dep /ops .
