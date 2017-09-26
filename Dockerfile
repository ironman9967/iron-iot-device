FROM node:8-slim

WORKDIR /app
ADD . /app

RUN npm i
RUN npm rebuild

ENV PORT 8081
ENV DOCKER TRUE
ENV REDIS_HOST redis-device

EXPOSE 8081

CMD ["node", "dist/index.js"]
