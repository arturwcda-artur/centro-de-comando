# INVENTÁRIO DE RECURSOS — Fase 0
Levantamento de 03/11/2026. Contagens obtidas por varredura de arquivos (somente leitura).

## 1. Acervo local — `DESKTOP-EMPRESA\GESTÃO_DE_OBRAS`
**Total:** 5.139 arquivos · 9,4 GB · sincronizado pelo Google Drive (pasta `DESKTOP-EMPRESA` dentro do computador "PC-TRABALHO").

### 1.1 Por tipo de arquivo
| Tipo | Qtde | | Tipo | Qtde |
|---|---|---|---|---|
| PDF | 2.593 | | DWG | 66 |
| XLSX | 1.030 | | DOC | 57 |
| DOCX | 208 | | MPP | 46 |
| ZIP | 158 | | XLSM | 32 |
| XLS | 133 | | RAR | 24 |
| JPG/JPEG/PNG | 173 | | MP4/OGG | 31 |

### 1.2 Obras por situação (conforme estrutura de pastas)
**2.1 — Em andamento**
| Pasta | Arquivos | MPP | Planilhas | PDF | Tamanho | Padrão 01–15? |
|---|---|---|---|---|---|---|
| ANP | 974 | 0 | 125 | 680 | 1,8 GB | Sim |
| Candangolandia | 1.021 | 3 | 230 | 592 | 2,0 GB | Sim + extras 16–21 |
| PRF-RECANTO | 465 | 7 | 75 | 185 | 648 MB | Sim + 16, 17 |
| Senado_Federal_bloco_14 | 1.186 | 29 | 316 | 718 | 1,7 GB | Sim + 16 |
| LEVORSSE (NILLS, container, malharia, manutenção) | 147 | 3 | 16 | 61 | 110 MB | **Não** |
| CDN-RETOMADA | 9 | 0 | 1 | 6 | 3,5 MB | **Não** |
| PODION | 6 | 0 | 3 | 0 | 157 KB | Sim (vazia) |
| Podion-Grafica | 1 | 0 | 1 | 0 | 48 KB | Não |
| PEDIDOS GERAIS | 3 | 0 | 1 | 0 | 204 KB | n/a (não é obra) |

**2.2 — Aguardando:** CEPI Águas Claras, MIRANTE, OBRA-ALEXANDRA, OBRA-CELSO, Piso_Elevado_Prodasen, Reforma do Colégio Cruzeiro, Reforma do Cruzeiro 90016/2025, levorsse-escola, obra_Vital_entorno.

**2.3 — Finalizadas:** mirante, tcdf.

**Outros:** `L7-BALANÇO` (financeiro da empresa, extratos e parcelamentos — dado sensível), `teste` (medição 9.rar).

> Observação: "LEVORSSE" agrupa várias frentes (NILLS, container, malharia, manutenção). Para o sistema, cada frente provavelmente é uma obra distinta — **decisão sua**.

### 1.3 Estrutura-padrão de pasta de obra (já em uso)
`01_Planejamento_e_Cronograma · 02_Orcamento_e_Licitacao · 03_Contratos · 04_Aditivos_e_Reequilibrios · 05_Medicoes · 06_Financeiro · 07_Compras_e_Materiais · 08_Projetos_Tecnicos · 09_Programacoes · 10_Atas_e_Reunioes · 11_Oficios_e_Requerimentos · 12_Documentos_Juridicos · 13_Equipe_e_Efetivo · 14_Diario_de_Obra · 15_Terceirizados · 99_REVISAR`

Essa estrutura será adotada como **taxonomia de tipos de documento** no sistema — permite classificar automaticamente os arquivos pela pasta de origem.

### 1.4 Biblioteca de ferramentas — `1.0-FERRAMENTAS DE GESTÃO`
Procedimentos (PDCA, 5 Porquês, OKR, SWOT), Planejamento/Orçamento (Curva ABC, BDI, TCPO, modelos Sienge, produtividade), Controle de tempo, Custos de equipe. Pastas 06 a 10 parcialmente vazias.

### 1.5 Outras pastas
- `DOC.ADV-11.46h` — contrato/edital, 1º termo aditivo, ofícios, relatório de sondagem.
- `arquivos soltos` — balanço L7 24/25, CDN (processos CNDT), RNEST, LOGAN, ERP-COLÉGIO, casa-do-candango, conteúdo pessoal.

## 2. Software e código
| Recurso | Situação |
|---|---|
| Repositório `17_Plano_de_Retomada` | Git local, 1 commit, sem remoto |
| Motor Python (`motor/retomada/*`) | 13 módulos: calendário, compras, config, cronograma, excel_writer, financeiro, fontes, ler_planilha, msproject_mpp, painel, recursos, sinapi |
| Testes | 7 arquivos pytest |
| Macros VBA MS Project | `NILLS_Formatacao_Gantt_v4.bas`, `NILLS_Produtividade.bas` |
| Painéis HTML estáticos | PRF retomada, containers Levorsse, pedidos gerais |

## 3. Ferramentas instaladas no PC
| Ferramenta | Situação |
|---|---|
| Git | 2.55 ✔ (e-mail configurado no repositório local) |
| Python | 3.14.2 ✔ · openpyxl 3.1.5 ✔ · pywin32 ✔ |
| MS Excel, MS Project, MS Access | ✔ (Office 16) |
| Google Drive para computador | ✔ |
| Notion desktop, Chrome | ✔ |
| Node.js / npm | ✘ **necessário para Next.js** |
| GitHub CLI (gh) | ✘ |
| Docker | ✘ (opcional) |
| Supabase CLI / Vercel CLI | ✘ (instaláveis via npm) |
| Java | ✘ (só seria necessário para MPXJ; não recomendado) |

## 4. Serviços em nuvem (contas acessadas pelos conectores)
| Serviço | Conta/escopo | Conteúdo identificado |
|---|---|---|
| Trello | 1 workspace pessoal | 5 quadros: *tarefas*, *C.SALLES-ENGENHARIA*, *Objetivos*, *Obras do Grupo - C.SALLES*, *NILLS — Gerência da Obra* |
| Google Agenda | arturwcda@gmail.com | 4 agendas: principal (America/Belem), *tarefas senado*, *Todoist* (feed), *Feriados no Brasil*. Rotina com blocos recorrentes ("Pomodoro-Senado", "Pomodoro-NILLS", "verificações-Gerais (obras)") |
| Notion | workspace "Notion de Artur wcda" | *🗂️ Central de Gestão — Artur* com bases *📋 Demandas Ativas* e *📁 Histórico de Reuniões*, *Acompanhamento Semanal*, *Template de Reunião Executiva*; também planos de leitura |
| Google Drive | arturwcda@gmail.com | Backups de 5 computadores (PC-TRABALHO, PC-CHACARA, PC-CASA-NOT, Meu laptop, Meu computador) |
| Gmail | arturwcda@gmail.com | ~325 mensagens na caixa de entrada (73 não lidas); sem marcadores personalizados |
| GitHub | — | Não verificado (sem autenticação) |
| Supabase / Vercel | — | Não verificado (sem credenciais) |
| Todoist | — | Existe uso (feed na Agenda), **sem conector** |

## 5. Pessoas/empresas citadas nos registros (para o cadastro, sem dados fictícios)
Empresas/marcas: L7 Construtora, C.SALLES Engenharia, CDN, Levorsse, Podion, Menrah Capital, Paladino, PIB School.
Contratantes públicos identificados pelas pastas: PRF, Senado Federal, ANP, SEEDF (Candangolândia), Prodasen, TCDF, CEPI.
> Esses nomes vêm das pastas; os vínculos obra ↔ empresa ↔ contratante **precisam ser confirmados por você** antes do cadastro.
