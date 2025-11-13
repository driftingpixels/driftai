# Use the official Node.js 20 image as the base
FROM node:20-slim

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
# This allows us to install dependencies before copying the rest of the application
COPY package*.json ./

# Install application dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the port that the application listens on
EXPOSE 3000

# Define the command to run your application
CMD ["npm", "start"]
