FROM node:13.12.0-alpine3.11

ARG SERVERLESS_VERSION

RUN yarn global add serverless@${SERVERLESS_VERSION}

ENTRYPOINT ["serverless"]

WORKDIR /app
