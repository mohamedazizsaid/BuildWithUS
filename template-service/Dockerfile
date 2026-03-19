FROM node:20-alpine

WORKDIR /app

# Copy shared-kernel package
COPY packages/shared-kernel /packages/shared-kernel
RUN cd /packages/shared-kernel && npm install

# Copy template service package.json and install deps
COPY template-service/package.json template-service/package-lock.json ./
RUN npm ci

# Link shared-kernel into node_modules
RUN mkdir -p node_modules/@winaity && \
    rm -rf node_modules/@winaity/shared-kernel && \
    ln -s /packages/shared-kernel node_modules/@winaity/shared-kernel

# Copy template service source
COPY template-service/src ./src
COPY template-service/tsconfig.json template-service/nest-cli.json* ./

# Copy generated proto TypeScript files (for imports)
COPY template-service/proto ./proto

# Copy raw proto files (for gRPC server runtime)
COPY packages/proto ./packages-proto

# Remove .env so it doesn't override docker-compose env vars
RUN rm -f .env .env.development .env.*

ENV PROTO_ROOT=./packages-proto

EXPOSE 50054

CMD ["npx", "nest", "start"]
