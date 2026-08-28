# Knowledge index

This folder is the **map of the system**. Cursor rules stay short and point here. Read only the files that match the task.

| File | When to read |
|---|---|
| [architecture.md](./architecture.md) | New session, cross-cutting change, “where does this live?” |
| [data-model.md](./data-model.md) | Prisma, JSONB page content, roles, migrations |
| [auth-and-realtime.md](./auth-and-realtime.md) | Login, JWT, cookies, SSE, push, ICS |
| [api.md](./api.md) | Nest modules, routes, service-layer authz |
| [web.md](./web.md) | Routes, stores, Query keys, page views |
| [types-and-contracts.md](./types-and-contracts.md) | `@family-life/types` as the shared contract |
| [testing-and-ci.md](./testing-and-ci.md) | Jest / Vitest / Playwright / `test:ci` |
| [known-gaps.md](./known-gaps.md) | Doc drift, incomplete features, known bugs |

**Do not** treat `PLAN.md` or `README.md` as ground truth without checking this folder and the code. `PLAN.md` is a historical checklist and can be ahead of or behind the repo.

When you change architecture (new module, route, store, Prisma model, Query key), update the matching knowledge file in the same PR/commit if possible.
