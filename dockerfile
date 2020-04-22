FROM node:12.16.2-buster

RUN npm install

EXPOSE 3003

CMD ['npm','start']