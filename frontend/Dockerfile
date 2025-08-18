# Multi-stage build for React frontend
ARG NODE_VERSION=20.19-alpine
FROM node:${NODE_VERSION} as base

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Development stage
FROM base as development
RUN npm install
COPY . .
EXPOSE 3000
CMD ["sh", "-c", "npm run build && npx serve dist -l 3000 -s"]

# Build stage
FROM base as build
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine as production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]