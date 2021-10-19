FROM node:13.12.0-alpine3.11

ARG SERVERLESS_VERSION

RUN yarn global add serverless@${SERVERLESS_VERSION} \
 && apk --no-cache add docker

ENTRYPOINT ["serverless"]

WORKDIR /app
