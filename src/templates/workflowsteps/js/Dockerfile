############################
# Build container
############################
FROM registry.cto.ai/official_images/node:latest AS dep
WORKDIR /ops
# RUN apk add python make
ADD package.json .
RUN npm install
ADD . .
RUN rm -rf lib && npm run build
############################
# Final container
############################
# FROM node:10-alpine
FROM registry.cto.ai/official_images/node:latest
###### Attempted to use meso aws-cli build
# FROM mesosphere/aws-cli // <- hit a bug with aws cli options
# RUN apk add --update nodejs
RUN apt update \
  && apt install -y --no-install-recommends \
  tar \
  python \
  openssh-client \
  apache2-utils \
  util-linux \
  bash \
  ca-certificates \
  python-pip \
  # alpine-sdk \
  python-dev \
  libffi-dev \
  libssl-dev \
  && pip install --upgrade \
  awscli \
  ansible==2.7.8 \
  boto \
  boto3 \
  botocore \
  && apt remove -y \
  python-pip \
  python-dev \
  libffi-dev \
  libssl-dev \
  && apt autoremove -y \
  && apt autoclean -y
WORKDIR /ops
COPY --from=dep /ops/lib .
COPY --from=dep /ops .
RUN echo 'ops:x:9999:9999::/ops:/bin/bash' >> /etc/passwd \
  && chown -R 9999 /ops && chgrp -R 9999 /ops