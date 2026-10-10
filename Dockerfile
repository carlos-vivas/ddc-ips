# Todo-en-uno: compila el frontend y sirve página + API con el mismo Node.
FROM node:22-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml .nvmrc ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# Dokploy inyecta las variables (PORT, BREVO_*, MAIL_*, DB) por entorno.
ENV PORT=3001
EXPOSE 3001

CMD ["node", "server/index.js"]
