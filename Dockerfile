FROM node:20-alpine

# Install wrangler CLI globally
RUN npm install -g wrangler

WORKDIR /app

# Install dependencies first to leverage Docker cache
COPY package*.json ./
RUN npm install

# Copy the rest of the source code
COPY . .

EXPOSE 5173

CMD ["npx", "wrangler", "pages", "dev", "--host", "0.0.0.0", "--", "npm", "run", "dev", "--", "--host", "0.0.0.0"]
