FROM node:17.0.1-alpine3.14

ARG SERVERLESS_VERSION

RUN yarn global add serverless@${SERVERLESS_VERSION} \
 && apk --no-cache add docker

ADD ./plugins /plugins

ENTRYPOINT ["serverless"]

WORKDIR /app
