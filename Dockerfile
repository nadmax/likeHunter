FROM node:22
WORKDIR /src/likeHunter
COPY package.json .
RUN npm install
COPY . .
ENTRYPOINT ["npm", "start"]


