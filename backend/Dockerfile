FROM node:20-alpine
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the source code
COPY . .

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "src/server.js"]