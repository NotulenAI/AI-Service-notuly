FROM oven/bun:1.2.2 AS deps
WORKDIR /app

# Salin manifest supaya cache install lebih efektif
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.2.2 AS runner
WORKDIR /app
ENV NODE_ENV=production

# Salin deps dan source
COPY --from=deps /app/node_modules /app/node_modules
COPY . .

EXPOSE 3000
CMD ["bun", "start"]

