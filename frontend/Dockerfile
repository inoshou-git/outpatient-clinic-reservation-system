FROM node:20-alpine as build

ARG ENV_NAME

WORKDIR /app
COPY package*.json ./
RUN npm cache clean --force && npm install
COPY . .

RUN set -a && . ./.env.${ENV_NAME} && set +a && npm run build

FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
