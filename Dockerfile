# Use official Node.js 22 Alpine image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package and yarn.lock
COPY package*.json ./

# Install dependencies
RUN yarn install

# Copy rest of the files
COPY . .

# Build the app
RUN yarn build

# Expose the port (make sure this matches the one in your .env)
EXPOSE 3000

# Start the app
CMD ["node", "src/server.js"]
