FROM node:18-slim

# Install git and ffmpeg
RUN apt-get update && \
    apt-get install -y git ffmpeg && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Clone your Node.js app
RUN git clone https://github.com/Hackyabhay007/image-server.git .

# Install dependencies
RUN npm install

# Expose app port
EXPOSE 3000

# Start the app
CMD ["node", "index.js"]
