# Stage 1: Build stage
FROM node:20-alpine AS build

# Pass required build arguments for Vite
ARG VITE_API_URL
ARG VITE_ZEGO_APP_ID
ARG VITE_ZEGO_SERVER_SECRET

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_ZEGO_APP_ID=${VITE_ZEGO_APP_ID}
ENV VITE_ZEGO_SERVER_SECRET=${VITE_ZEGO_SERVER_SECRET}

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy lockfile and package.json
COPY pnpm-lock.yaml package.json ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the app
COPY . .

# Build the app
RUN pnpm run build

# Stage 2: Production stage
FROM nginx:alpine

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy our custom nginx config template
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Railway injects $PORT at runtime — envsubst replaces ${PORT} in the template
# nginx docker image automatically processes /etc/nginx/templates/ via envsubst
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]

