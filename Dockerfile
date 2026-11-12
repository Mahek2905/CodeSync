FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
ARG VITE_API_URL=http://localhost:4000/api
ARG VITE_SOCKET_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile=false
COPY . .
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
RUN corepack enable
RUN pnpm dlx serve --help
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["pnpm", "dlx", "serve", "-s", "dist", "-l", "3000"]
