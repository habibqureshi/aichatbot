FROM node:22-alpine AS base

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the Next.js application for production
RUN npm run build

FROM node:22-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/next.config.ts ./next.config.ts
COPY --from=base /app/package.json ./package.json

# Expose the port Next.js app runs on
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
