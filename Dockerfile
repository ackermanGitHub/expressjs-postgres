# Use an official Node.js runtime as a parent image
FROM node:14

# Set the working directory to /app
WORKDIR /app

# Copy the package.json and yarn.lock files to the container
COPY package.json yarn.lock ./

# Install app dependencies using Yarn
RUN yarn install --production

# Copy the rest of the application code to the container
COPY . .

# Expose port 3333 for the app to listen on
EXPOSE 3333

# Start the app using the command "yarn start"
CMD ["yarn", "start"]

# docker build -t express-app .

# docker run -p 3333:3333 express-app