# Use the official Node.js 20 image as the base
FROM node:20-slim

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
# This allows us to install dependencies before copying the rest of the application
COPY package*.json ./

# Install application dependencies
RUN npm install --production

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port that the application listens on
# Cloud Run will inject the PORT environment variable, but this is good practice
EXPOSE 8080

# Define the command to run your application
CMD ["npm", "start"]
