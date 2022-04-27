FROM node:17.0.1-alpine3.14

ARG SERVERLESS_VERSION

ADD ./plugins /plugins

RUN yarn global add serverless@${SERVERLESS_VERSION} \
 && mkdir /plugins/prune \
 && yarn add --cwd /plugins/prune serverless-prune-plugin \
 && mkdir /plugins/fargate \
 && yarn add --cwd /plugins/fargate serverless-fargate \
 && apk --no-cache add docker

ENTRYPOINT ["serverless"]

WORKDIR /app
