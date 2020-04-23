FROM node:12.16.2-buster

WORKDIR /app
COPY . /app

RUN npm install && npm install pm2 -g

EXPOSE 3003

CMD pm2 start bin/www --no-daemon