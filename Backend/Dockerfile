# Use the official Node.js 20 Alpine image
FROM node:20-alpine

# Set the working directory directly
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies including dev dependencies for building
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the TypeScript code
RUN npm run build

# Expose the API port
EXPOSE 3000

# Start the application using the compiled JavaScript
CMD ["npm", "start"]
