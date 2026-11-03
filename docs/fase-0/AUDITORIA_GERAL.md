# AUDITORIA GERAL — Fase 0
**Projeto:** Centro de Comando Gerencial · **Data:** 03/11/2026 · **Fuso:** America/Sao_Paulo
**Natureza:** auditoria somente leitura. Nenhum registro existente foi alterado, nenhum arquivo foi excluído, nenhuma infraestrutura foi criada.

---

## 1. Resumo executivo

| Item | Situação encontrada |
|---|---|
| Acervo local de obras | **5.139 arquivos / 9,4 GB** em `DESKTOP-EMPRESA\GESTÃO_DE_OBRAS` |
| Obras identificadas por pasta | 9 em andamento · 9 aguardando · 2 finalizadas |
| Cronogramas MS Project | **46 arquivos .mpp** (29 só no Senado bloco 14) |
| Planilhas | 1.030 .xlsx · 133 .xls · 32 .xlsm |
| Repositórios Git | **1 local** (`PRF-RECANTO\17_Plano_de_Retomada`), 1 commit, **sem remoto no GitHub** |
| Código reaproveitável | Motor Python da retomada PRF (cronograma, financeiro, compras, SINAPI, geração .mpp via COM, painel HTML, testes) |
| Conectores ativos nesta sessão | Trello, Google Agenda, Notion, Google Drive, Gmail (leitura confirmada) |
| Conectores não ativos | GitHub (requer autorização), MS Project/Excel (não têm API em nuvem) |
| Ambiente de desenvolvimento web | **Ausente**: sem Node.js, npm, gh CLI, Docker, Supabase CLI, Vercel CLI |
| Sincronização em nuvem | A pasta `DESKTOP-EMPRESA` já é sincronizada pelo Google Drive para computador |

**Conclusão central:** os dados existem e estão razoavelmente organizados, mas estão **fragmentados em cinco lugares** (pastas locais/Drive, Trello, Notion, Google Agenda, MS Project) sem fonte oficial definida. O sistema é viável com a arquitetura proposta, com uma ressalva estrutural: **MS Project e Excel locais só podem ser integrados por um agente rodando no seu PC Windows**, porque não há API em nuvem para esses arquivos.

---

## 2. O que foi verificado (os 10 itens solicitados)

### 2.1 Diretórios e arquivos acessíveis
- `C:\Users\Arthur\Desktop\DESKTOP-EMPRESA\` — contém `GESTÃO_DE_OBRAS`, `DOC.ADV-11.46h`, `arquivos soltos`.
- `GESTÃO_DE_OBRAS\1.0-FERRAMENTAS DE GESTÃO` — biblioteca de modelos (PDCA, OKR, Curva ABC, BDI, TCPO, planilhas Sienge, produtividade).
- `GESTÃO_DE_OBRAS\2.0-OBRAS` — obras separadas por situação (2.1 Em andamento, 2.2 Aguardando, 2.3 Finalizadas), mais `L7-BALANÇO` e `teste`.
- `GESTÃO_DE_OBRAS\Marcas` — CSALLES Engenharia, Menrah Capital, Paladino, PIB School.
- Detalhamento completo em `INVENTARIO_DE_RECURSOS.md`.

### 2.2 Repositórios GitHub
- **Nenhum repositório GitHub acessível.** O CLI `gh` não está instalado e o conector GitHub do Claude exige autorização (`/mcp`).
- Único repositório Git: `PRF-RECANTO\17_Plano_de_Retomada` (local, 1 commit "REV-02", sem `remote`).

### 2.3 Projetos existentes (software)
| Projeto | Local | Tecnologia | Valor para o novo sistema |
|---|---|---|---|
| Motor de retomada PRF | `PRF-RECANTO\17_Plano_de_Retomada\motor` | Python + openpyxl + pywin32 (COM do MS Project) + pytest | Alto: base do agente local e das regras de cronograma |
| Painel retomada | `17_Plano_de_Retomada\painel_retomada.html` | HTML estático | Referência visual |
| Painel containers | `LEVORSSE\container\Painel_Obra_Containers.html` | HTML estático | Referência |
| Pedidos gerais | `2.1-EM ANDAMENTO\PEDIDOS GERAIS\Index.html` | HTML estático | Referência |
| Macros Gantt NILLS | `LEVORSSE\NILLS\03_PLANEJAMENTO\...\MACROS\*.bas` | VBA (MS Project) | Padrão de formatação a preservar |

### 2.4 Planilhas e cronogramas
- 46 `.mpp`: Senado bloco 14 (29), PRF-Recanto (7), Candangolândia (3), Levorsse (3), Mirante finalizada (2), outros.
- Planilhas de medição, orçamento, aditivo (ex.: `Planilha_75533725_1__Aditivo_Delegacia_PRF_RV03.xlsx`), resumos de pleitos (Candangolândia).
- **Não há um padrão único de planilha de controle entre obras** — cada obra tem formatos próprios. Isso afeta a importação (ver riscos).

### 2.5 Documentos das obras
- Estrutura padronizada **01 a 15 + 99_REVISAR** existe em ANP, PRF-Recanto, Senado bloco 14 e PODION; Candangolândia segue o padrão com pastas extras (16 a 21); LEVORSSE e CDN-RETOMADA **não seguem o padrão**.
- 2.593 PDFs, 66 DWG, fotos, áudios de WhatsApp, e-mails exportados (.html).

### 2.6 Conectores configurados
Ativos e testados em modo leitura: **Trello, Google Agenda, Notion, Google Drive, Gmail**. Também disponíveis: Claude in Chrome, controle do computador, tarefas agendadas. Detalhes em `MAPA_DE_INTEGRACOES.md`.

### 2.7 Integrações MCP disponíveis
Ver seção 3. Ponto crítico: **os conectores MCP pertencem a esta sessão do Claude, não ao futuro sistema.** O sistema em produção precisará de credenciais próprias (OAuth do Google, token do Trello, integração do Notion).

### 2.8 APIs acessíveis
| Serviço | API pública | Observação |
|---|---|---|
| Trello | REST (key + token) | Gratuita, limites de taxa |
| Google Agenda / Drive / Gmail | REST + OAuth 2.0 | Gratuita; requer projeto no Google Cloud |
| Notion | REST (integração interna) | Gratuita |
| GitHub | REST/GraphQL | Gratuita |
| MS Project desktop | **Sem API em nuvem** | Somente COM local (já usado no motor) ou exportação XML |
| Excel local | **Sem API em nuvem** | Leitura local (openpyxl) ou Microsoft Graph se migrar para OneDrive |

### 2.9 Limitações de autenticação
- GitHub: não autenticado.
- Google: o futuro sistema exigirá um app OAuth próprio no Google Cloud (modo "teste" com seu usuário basta para uso pessoal; escopos de Gmail são "restritos").
- MS Project/Excel: arquivos locais; o servidor em nuvem **não enxerga o seu disco**.
- Supabase/Vercel: contas não verificadas (não há CLI instalado nem credenciais no ambiente).

### 2.10 Possibilidades de sincronização
Resumo: Trello, Agenda, Notion e Drive podem ser sincronizados **direto da nuvem**; MS Project, Excel e pastas locais exigem **agente local Windows** que lê os arquivos e envia ao banco. Ver `MAPA_DE_INTEGRACOES.md`.

---

## 3. Achados que mudam o projeto

1. **Já existe uma "Central de Gestão — Artur" no Notion** (criada em 11/05/2026) com as bases *Demandas Ativas* e *Histórico de Reuniões* e a página *Acompanhamento Semanal*. Aparentemente sem atualização desde maio. Precisa de decisão: importar, manter ou aposentar.
2. **Tarefas estão espalhadas em 4 lugares**: Trello (5 quadros), Notion (Demandas Ativas), Google Agenda (blocos "Pomodoro-Senado", "Pomodoro-NILLS", agenda "tarefas senado") e **Todoist** (aparece como agenda sincronizada no Google; o Todoist não está na lista de ferramentas do briefing nem tem conector ativo).
3. **Você atua para várias empresas/marcas** (L7 Construtora, C.SALLES Engenharia, CDN, Levorsse, Menrah, Paladino...). O modelo de dados precisa de uma entidade **Empresa/Contratante** desde o início — não apenas "Cliente".
4. **Fusos divergentes**: a agenda principal e "tarefas senado" estão em `America/Belem`; outros eventos em `America/Sao_Paulo`. Hoje os dois são UTC−3 (sem horário de verão), então não há erro prático, mas o sistema deve normalizar tudo para `America/Sao_Paulo`.
5. **O acervo inteiro (9,4 GB) já sincroniza para o Google Drive.** Não é necessário — nem barato — copiar documentos para o Supabase Storage. A biblioteca documental deve **indexar e referenciar** os arquivos do Drive.
6. **O motor Python da PRF já resolve a integração mais difícil (MS Project via COM)** e tem testes. Ele deve ser reaproveitado como núcleo do agente local.
7. **O repositório do novo sistema não deve ficar dentro de `DESKTOP-EMPRESA`**, pois a pasta é sincronizada pelo Drive (dependências como `node_modules` gerariam dezenas de milhares de arquivos sincronizados).

---

## 4. O que NÃO foi feito (conforme instrução)
- Não foram lidos conteúdos de e-mails, cartões ou páginas além de títulos/metadados necessários ao inventário.
- Não foram criadas contas, projetos em nuvem ou repositórios.
- Não foram criados dados fictícios.
- Nenhum arquivo foi aberto em modo de escrita, movido ou excluído. Os únicos arquivos criados são os desta pasta `FASE_0`.

## 5. Decisões que dependem de você (antes da Fase 1)
| # | Decisão | Recomendação |
|---|---|---|
| D1 | Aprovar a pilha + agente local + documentos por referência ao Drive | Aprovar |
| D2 | Fonte oficial das tarefas pessoais: Centro de Comando, Trello, Notion ou Todoist? | Centro de Comando; Trello fica para tarefas de equipe |
| D3 | Destino da "Central de Gestão — Artur" no Notion | Importar como histórico e congelar |
| D4 | Gmail e Todoist entram no escopo? | Fora até a Fase 9 |
| D5 | Lista oficial de obras e vínculos empresa ↔ contratante (ex.: frentes da LEVORSSE separadas?) | Confirmar na Fase 4, obra a obra |
| D6 | Contas: GitHub (já possui?), Supabase, Vercel; local do repositório `C:\dev\centro-de-comando`; autorização para instalar Node.js LTS e gh CLI | Criar contas gratuitas agora; Pro só na Fase 5 |
| D7 | Dados financeiros da empresa (L7-BALANÇO, extratos) entram no sistema? | Não, por ora |

## 6. Documentos desta entrega
1. `AUDITORIA_GERAL.md` (este)
2. `INVENTARIO_DE_RECURSOS.md`
3. `MAPA_DE_INTEGRACOES.md`
4. `ARQUITETURA_PROPOSTA.md`
5. `MODELO_DE_DADOS_PROPOSTO.md`
6. `ROADMAP_DE_DESENVOLVIMENTO.md`
7. `ESTIMATIVA_DE_CUSTOS.md`
8. `MATRIZ_DE_RISCOS_TECNICOS.md`
