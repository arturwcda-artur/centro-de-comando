# Mesa do Gestor — desenho (aprovado em 26/11/2026)

## Problema
O Arthur é o **gestor operacional do Grupo C.Salles** (L7 Construtora, CDN Engenharia, C.Salles Engenharia e as marcas Menrah Capital, Paladino e PIB School). Ao abrir o Centro de Comando ele vê muita coisa e precisa garimpar o que é dele; há itens que nem lhe competem. A tela inicial atual ("Painel executivo") é centrada em obras.

## Objetivo
A tela inicial passa a ser a **Mesa do Gestor**: mostra **somente o que exige a direção do Arthur**, em qualquer empresa e em 4 áreas (obras e execução; compras e suprimentos; pessoas; financeiro, contratos e licitações), já com a recomendação do assistente. Todo o resto continua acessível pelo menu.

Restrições: 100% plano gratuito (Supabase + Vercel free), sem serviço novo. Trello continua sendo onde o Arthur direciona as equipes; o sistema é onde ele analisa e decide.

## Estrutura do grupo
`empresas` ganha hierarquia: `tipo` (`grupo` | `empresa` | `marca`) e `empresa_mae_id` (auto-referência).
Carga inicial: Grupo C.Salles (grupo) → L7 Construtora, CDN Engenharia, C.Salles Engenharia (empresas) → Menrah Capital, Paladino, PIB School (marcas). Obras já apontam para empresa (`empresa_id`); conferir e completar o vínculo das obras ativas (PRF, Senado, ANP, Candangolândia → L7; NILLS, Levorsse → CDN — confirmar com o Arthur na implementação).

## As 4 caixas (sempre nesta ordem)
| Caixa | Regra de entrada | Fonte |
|---|---|---|
| 🔴 DECIDIR | `decisoes` com `tipo='decisao'`, `status` aberta e não adiada (`adiar_ate` nula ou ≤ hoje) | lançadas pelo assistente (briefing, problemas graves, OS conferidas) |
| 🟠 APROVAR | `decisoes` com `tipo='aprovacao'` abertas **+** medições pendentes de aprovação **+** aditivos/contratos aguardando assinatura | `decisoes`, `medicoes`, `aditivos`, `contratos` |
| 🟡 COBRAR | tarefas delegadas (responsável ≠ Arthur) com prazo vencido **ou** sem movimento há 7 dias, agrupadas por responsável | `tarefas` + espelho do Trello |
| ⚠️ ALERTAS | vencimentos em até 15 dias (`v_vencimentos`), riscos críticos (`v_riscos_criticos`), marcos/obras com atraso e alertas já calculados em `lib/alertas.ts` | views e libs existentes |

Cada item = 1 linha: **o quê · empresa/obra · área · responsável · prazo · recomendação (quando houver)**. Ordenação dentro da caixa: prazo mais próximo primeiro; empate pela gravidade.
Filtros no topo: empresa (com "Grupo inteiro"), obra/setor, área.

## Ações no detalhe do item
- **Decidido**: grava `decisao`, `data_decisao`, `status='decidida'`; opcionalmente cria cartão no Trello para o responsável (reaproveita `trello_criacoes`/espelho).
- **Delegar**: escolhe pessoa e prazo → cria tarefa/cartão; o item sai da mesa e, se atrasar, volta em COBRAR.
- **Adiar**: grava `adiar_ate`; o item volta nessa data.

## Mudanças de dados (migração única)
- `empresas`: `tipo text not null default 'empresa'`, `empresa_mae_id uuid null references empresas(id)`.
- `decisoes`: `tipo text not null default 'decisao'` (`decisao` | `aprovacao`), `area text null` (`obras` | `compras` | `pessoas` | `financeiro`), `empresa_id uuid null references empresas(id)`, `recomendacao text null`, `principio text null`, `impacto text null`, `adiar_ate date null`.
- RPC `lancar_item_mesa(...)` (security definer, só papel do assistente/admin) para o assistente lançar DECIDIR/APROVAR a partir do briefing.
- Nada é removido; o "Painel executivo" atual vira a rota `/painel` no menu.

## Documentos: pastas extras com nome
O agente local (`cc_agente/documentos.py`) passa a categorizar pastas 16+ como categoria `pasta_da_obra` e a tela de documentos mostra o **nome da pasta** (ex.: "Plano de Retomada") em vez de "outro". Conferir se há restrição de valores em `documentos.categoria` antes.

## Fora do escopo agora
Notificações (push/e-mail), integração com sistemas de RH/financeiro externos, permissões por empresa para outros usuários.

## Testes
- Funções puras em `lib/mesa.ts` (seleção e ordenação das 4 caixas, regra de COBRAR, regra de adiar) com testes no padrão `*.test.ts` existente.
- Migração aplicada e conferida no banco; tela conferida no navegador com dados reais (NILLS, PRF).
- Agente: teste de `categoria_de` para pastas 16+.
