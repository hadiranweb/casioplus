FROM node:22-bookworm-slim AS build

WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.18.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json .prettierrc ./
COPY apps ./apps
COPY packages ./packages
COPY services ./services
COPY migrations ./migrations
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @casioplus/app-web build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=build /workspace/apps/app-web/dist ./dist
COPY --from=build /workspace/deployment/static-server.mjs ./static-server.mjs
USER node
EXPOSE 8080
CMD ["node", "static-server.mjs"]
