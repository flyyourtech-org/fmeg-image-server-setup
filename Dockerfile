FROM node:18-slim

# Install ffmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Install dependencies
RUN npm install --production

# Create uploads directory (safety)
RUN mkdir -p /app/uploads

# Expose app port
EXPOSE 3000

# Start app
CMD ["node", "index.js"]
