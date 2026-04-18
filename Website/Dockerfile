# Stage 1: Build stage
FROM node:20-alpine AS build

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

# Copy custom nginx config if you have one, 
# otherwise default is fine for simple SPA routing if we add it.
# For now, let's just use the default.

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
