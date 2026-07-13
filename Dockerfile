FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN npm install --workspace=@gymeasure/shared --workspace=@gymeasure/api
RUN npm run build -w @gymeasure/shared && npm run build -w @gymeasure/api
ENV NODE_ENV=production
EXPOSE 4000
CMD ["npm", "run", "start", "-w", "@gymeasure/api"]
