# Use an official Node.js runtime as a parent image
FROM node:20-slim

# Set the working directory in the container
WORKDIR /app

# Install pnpm
RUN corepack enable

# Copy package management files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application's source code
COPY . .

# Build the Next.js application (skip lint/type checks to avoid OOM in constrained builders)
RUN NEXT_SKIP_BUILD_CHECKS=true pnpm build

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the app
CMD ["pnpm", "start:https"]
