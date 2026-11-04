# Agente local

Programa Python executado no PC Windows pelo Agendador de Tarefas (ver ADR 0002). Requer Python 3.11 ou superior.

## Módulos
| Módulo | Função | Fase |
|---|---|---|
| `cc_agente.backup` | `pg_dump` do banco para uma pasta sincronizada pelo Google Drive, com retenção | 2 ✅ |
| `cc_agente.inventario_obras` | lê as pastas de obras (somente leitura) e gera as propostas da importação assistida | 4 ✅ |
| `cc_agente.cronogramas` | leitura de `.mpp` via COM, somente leitura, e envio ao banco com papel restrito | 6 ✅ |
| `cc_agente.excel` | importação de planilhas por modelo cadastrado | 7 |
| `cc_agente.indexador` | índice das pastas das obras, sem cópia | 8 |

## Configuração
Arquivo `%USERPROFILE%\.centro-de-comando\agente.env`, **fora do repositório**. Também é possível indicar outro caminho com a variável `CC_AGENTE_CONFIG`. Veja [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md), seção D.

## Testes
```bash
py -m pytest -q
```

## Regras
- O agente nunca altera nem move arquivos de origem. A única exclusão que faz é a retenção dos próprios backups (`cc_backup_*.dump`).
- Senhas são passadas ao `pg_dump` por variável de ambiente, nunca pela linha de comando.
