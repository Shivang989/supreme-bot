FROM node:20-alpine

WORKDIR /app

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm ci

# Copy TypeScript config and source code
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript to JavaScript
RUN npx tsc

# Hugging Face Spaces expects port 7860
ENV PORT=7860
ENV NODE_ENV=production
EXPOSE 7860

# Run as non-root user (required by Hugging Face Spaces security policy)
RUN adduser -D -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

CMD ["node", "dist/server.js"]
