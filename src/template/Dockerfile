############################
# Build container
############################
FROM node:10-alpine AS dep

WORKDIR /app

RUN apk add python make
ADD package.json .
RUN npm install

ADD . .

############################
# Final container
############################
FROM node:10-alpine

WORKDIR /app

COPY --from=dep /app .
