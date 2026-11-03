# ESTIMATIVA DE CUSTOS — Fase 0
Preços públicos conforme meu conhecimento (referência 2025–2026). **Confirme nos sites oficiais antes de contratar** — os fornecedores reajustam planos com frequência. Câmbio de referência: US$ 1 ≈ R$ 5,50.

## 1. Cenários

| Item | Cenário A — Mínimo (validação) | Cenário B — Recomendado (uso profissional contínuo) |
|---|---|---|
| Supabase | Free: 500 MB banco, 1 GB storage, **projeto pausa após 7 dias sem uso**, sem backup automático | Pro: ~US$ 25/mês — 8 GB banco, 100 GB storage, backups diários, sem pausa |
| Vercel | Hobby: gratuito, **termos restringem uso comercial** | Pro: ~US$ 20/mês por usuário |
| GitHub | Gratuito (repo privado, Actions com cota) | Gratuito |
| Domínio .com.br | opcional | ~R$ 40/ano (Registro.br) |
| Google Cloud (OAuth, APIs Agenda/Drive) | Gratuito | Gratuito |
| Trello / Notion APIs | Gratuito (planos atuais) | Gratuito |
| MS Project / Excel | Licenças já existentes | Já existentes |
| IA (Fase 10) | US$ 0 até a Fase 10 | US$ 5–30/mês conforme uso, com teto configurado |
| **Total mensal** | **R$ 0** | **≈ R$ 250–440/mês** (≈ US$ 45 + IA) |

## 2. Recomendação
- **Fases 1 a 4: Cenário A (R$ 0).** Sem dados críticos ainda; o backup semanal para o Drive cobre a ausência de backup automático.
- **A partir da Fase 5 (primeiro uso real): migrar Supabase para Pro.** A pausa por inatividade e a falta de backup diário são inaceitáveis para dados contratuais.
- **Vercel Pro** quando o sistema entrar em uso diário profissional (adequação aos termos de uso).

## 3. Custos evitados pela arquitetura
| Decisão | Economia |
|---|---|
| Documentos referenciados no Drive em vez de copiados (9,4 GB) | Evita estourar o storage e duplicar o acervo |
| Jobs no PostgreSQL em vez de Inngest/Trigger.dev | Evita US$ 20–50/mês |
| Busca full-text do PostgreSQL em vez de Elastic/Algolia | Evita US$ 30+/mês |
| Agente local reaproveitando motor Python existente | Evita licenças de conversores de .mpp |

## 4. Custos que dependem de você
- Tempo seu para validar cadastros e mapear planilhas (maior "custo" real do projeto).
- Manter o PC com MS Project ligado nos horários de sincronização do agente local.

**Nenhuma infraestrutura paga foi criada nesta fase.**
