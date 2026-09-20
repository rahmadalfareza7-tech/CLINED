FROM node:22-alpine
WORKDIR /app
COPY . .
ENV NODE_ENV=production
ENV PORT=3000
RUN npm install --omit=dev
EXPOSE 3000
CMD ["node", "local-server.mjs"]
