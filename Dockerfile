FROM node:gallium-slim

RUN apt-get update

WORKDIR /app
COPY . /app
RUN yarn install --prod

CMD yarn start
