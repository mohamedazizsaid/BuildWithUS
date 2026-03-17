FROM oven/bun:1-alpine AS deps

WORKDIR /app

RUN apk add --no-cache protobuf protobuf-dev

COPY tsconfig.base.json /tsconfig.base.json

COPY packages /packages
RUN cd /packages/shared-kernel && bun install --frozen-lockfile

COPY services/template-service/package.json services/template-service/bun.lock* ./
RUN bun install --frozen-lockfile

FROM deps AS development

ENV NODE_ENV=development
ENV PROTO_ROOT=./proto

COPY services/template-service/src ./src
COPY services/template-service/tsconfig.json ./
COPY services/template-service/ormconfig.ts ./

RUN mkdir -p proto/generated proto/google/api && \
    cp /packages/proto/*.proto ./proto/ && \
    cp -r /packages/proto/google/api/* ./proto/google/api/ && \
    cp -r /packages/proto/gen/ts/* ./proto/generated/

CMD ["bun", "run", "start:dev"]
