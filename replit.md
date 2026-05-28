# Gastito

A conversational Chilean AI financial assistant that helps users manage spending, budgets, debts, and financial decisions through natural language chat — like talking to a financially smart friend from Chile.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/mobile run dev` — run the Expo mobile app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `OPENAI_API_KEY` — OpenAI key for AI chat parsing

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + Google Gemini SDK (gemini-2.5-flash)
- Mobile: Expo (React Native) with expo-router
- DB: AsyncStorage (mobile-local, no server DB in MVP)
- Build: esbuild (CJS bundle for server)

## Where things live

- `artifacts/mobile/` — Expo mobile app (all screens + context)
- `artifacts/mobile/app/(tabs)/` — 5 tabs: Chat, Gastos, Cuentas, Deudas, Resumen
- `artifacts/mobile/context/GastitoContext.tsx` — global state: wallets, transactions, debts, chat
- `artifacts/mobile/constants/colors.ts` — design tokens (light + dark)
- `artifacts/api-server/src/routes/gastito/` — AI chat endpoint (SSE streaming)
- `lib/api-spec/openapi.yaml` — OpenAPI contract

## Architecture decisions

- AsyncStorage-first for MVP: no Postgres dependency on mobile, instant local persistence
- SSE streaming for chat: responses stream token-by-token for responsive feel
- Transaction parsing via structured prompt: `[TRANSACTION]...[/TRANSACTION]` block in AI response lets the server logic stay deterministic — only OpenAI does language understanding
- Confirmation flow: AI detects transaction → user confirms/rejects before any state mutation
- gpt-4o-mini: cost-effective for high-frequency chat parsing, keeps API costs low

## Product

Gastito understands Chilean Spanish slang ("8 lucas", "12 mil", "medio palo"), detects expense/income transactions in natural language, asks for confirmation before registering, tracks wallets/accounts, friend debts, and provides a monthly financial summary. The chat tab is the primary interface — everything else is read/manage.

## User preferences

- No emojis anywhere in the app
- Chilean Spanish tone: direct, slightly sarcastic for unnecessary spending
- Structured bot responses, not casual chat
- Mobile-first, conversational-first UX

## Gotchas

- After any backend change, restart the `API Server` workflow before testing chat
- The AI chat route at `/api/gastito/chat` uses SSE — test with curl or Expo client, not browser fetch directly
- Transaction confirmation happens client-side; the server only parses/responds

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
