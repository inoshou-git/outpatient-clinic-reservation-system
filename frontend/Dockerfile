FROM node:20-alpine as build

ARG REACT_APP_WEBSOCKET_URL
ARG REACT_APP_SITE_NAME_SUFFIX

WORKDIR /app
COPY package*.json ./
RUN npm cache clean --force && npm install
COPY . .

RUN REACT_APP_WEBSOCKET_URL=${REACT_APP_WEBSOCKET_URL} REACT_APP_SITE_NAME_SUFFIX=${REACT_APP_SITE_NAME_SUFFIX} npm run build

FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
