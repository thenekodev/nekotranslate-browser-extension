FROM node:24.1.0-bookworm
RUN apt update && apt install -y \
    git \
    zip
WORKDIR /app
RUN chown -R node:node .
USER node

