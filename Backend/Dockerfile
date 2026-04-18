# Use the official Node.js 20 Alpine image
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

# Set the working directory
WORKDIR /usr/src/app

# Copy lockfile and package.json
COPY pnpm-lock.yaml package.json ./

# Install dependencies including dev dependencies for building
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the TypeScript code
RUN pnpm run build

# Expose the API port
EXPOSE 3000

# Start the application using the compiled JavaScript
CMD ["npm", "start"]
