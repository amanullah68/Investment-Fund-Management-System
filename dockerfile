# === Stage 1: Build the application ===
FROM node:22.14.0-alpine AS builder
WORKDIR /app

# Copy package files and install all dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the source code and build the app
COPY . .
RUN npm run build

# === Stage 2: Production image ===
FROM node:22.14.0-alpine
WORKDIR /app

# Only install production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy the built files from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the port the app listens on (adjust if needed)
EXPOSE 3000

# Command to run the built app
CMD ["node", "dist/app.js"]
