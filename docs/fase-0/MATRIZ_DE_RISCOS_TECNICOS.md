# MATRIZ DE RISCOS TÉCNICOS — Fase 0
Escala 1–5. Severidade = Probabilidade × Impacto (≥15 crítico · 8–14 alto · ≤7 moderado).

| # | Risco | Origem | P | I | Sev. | Resposta |
|---|---|---|---|---|---|---|
| R1 | Planilhas sem padrão entre obras tornam a importação de medições/orçamentos frágil | Auditoria: ~1.200 planilhas com layouts próprios | 5 | 4 | **20** | Importador por **modelo cadastrado** (1 tipo por vez), com pré-visualização e confirmação; obra-piloto PRF |
| R2 | MS Project só acessível no PC local; PC desligado = cronograma desatualizado | Sem API em nuvem | 4 | 4 | **16** | Agente local agendado + exibição clara da "data da última leitura" em cada tela; alerta se > 7 dias |
| R3 | Duas fontes sobrescrevendo uma à outra (Trello × Notion × sistema) | Tarefas hoje em 4 lugares | 4 | 4 | **16** | Fonte oficial por tipo de dado; gravação externa desligada; detecção de conflito por hash + data |
| R4 | Vazamento de credenciais/tokens (Google, Trello, service_role) | Integrações múltiplas | 2 | 5 | 10 | Variáveis de ambiente, Supabase Vault, `.gitignore` + varredura de segredos no CI, chaves com escopo mínimo |
| R5 | Perda de dados por falta de backup no plano gratuito | Supabase Free | 3 | 5 | **15** | `pg_dump` semanal para o Drive desde a Fase 2; Pro a partir da Fase 5; teste de restauração na Fase 11 |
| R6 | Pausa automática do projeto Supabase Free por inatividade | Regra do plano | 4 | 2 | 8 | Aceitável só nas fases de construção; migrar para Pro no uso real |
| R7 | Repositório dentro da pasta sincronizada pelo Drive (node_modules) | Estrutura atual do Desktop | 4 | 3 | 12 | Repositório em `C:\dev\...`; Drive não sincroniza código |
| R8 | Dados importados incorretos interpretados como verdade pela IA | Fase 10 | 3 | 4 | 12 | IA só lê views; cita fonte e data; marca "estimativa" e "recomendação" |
| R9 | Escopos "restritos" do Gmail exigem verificação do Google para apps públicos | Política Google | 3 | 2 | 6 | App OAuth em modo teste (uso só seu); Gmail fora do escopo inicial |
| R10 | Mudança de API/limites de taxa (Trello, Notion) | Terceiros | 3 | 2 | 6 | Conectores isolados, retry com backoff, painel de erros |
| R11 | Ambiente de desenvolvimento ausente (Node, gh) atrasa Fase 1 | Auditoria | 5 | 2 | 10 | Instalar Node LTS + Git já existente + gh CLI no início da Fase 1 (com sua autorização) |
| R12 | Cadastro de obras/vínculos empresa↔contratante errado | Nomes vindos de pastas | 3 | 3 | 9 | Importação assistida: você confirma cada obra |
| R13 | Escopo cresce sem controle (Gmail, Todoist, novas telas) | Natureza do projeto | 4 | 3 | 12 | Princípio de condução: toda nova demanda passa por ADR + avaliação de impacto |
| R14 | Dependência de um único fornecedor de IA | Fase 10 | 2 | 2 | 4 | Camada `ai-gateway` com provedor configurável |
| R15 | Arquivos Excel abertos durante a leitura do agente | Uso simultâneo | 3 | 1 | 3 | Ler cópia temporária; tentar novamente depois |
| R16 | Dados financeiros sensíveis (L7-BALANÇO, extratos) expostos | Acervo local | 2 | 5 | 10 | Fora do escopo de indexação até decisão explícita sua; RLS + MFA |

## Riscos críticos a tratar antes da Fase 5
R1, R2, R3, R5.
