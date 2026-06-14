FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

COPY package.json ./
RUN npm install --only=production

COPY --from=builder /app/dist ./dist
COPY data ./data

EXPOSE 5005

ENV PORT=5005
ENV NODE_ENV=production

CMD ["npm", "start"]
