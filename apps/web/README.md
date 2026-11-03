# apps/web — aplicação do Centro de Comando

Next.js 16 · React 19 · TypeScript · Tailwind 4. Arquitetura em [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md).

```bash
npm run dev -w @cc/web        # desenvolvimento (requer apps/web/.env.local)
npm run test -w @cc/web       # testes
npm run build -w @cc/web      # build de produção
```

Publicação: Vercel, com raiz `apps/web` (o framework está fixado em `vercel.json`). Ver [docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md), seção E.
