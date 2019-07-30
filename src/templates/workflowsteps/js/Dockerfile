############################
# Build container
############################
FROM node:10-alpine AS dep

# This is enforced because otherwise the code wouldn't get detected by the CLI
WORKDIR /ops

RUN apk add python make
ADD package.json .
RUN npm install

ADD . .

############################
# Final container
############################
FROM node:10-alpine

WORKDIR /ops

COPY --from=dep /ops .
