# Agente local (Fase 2: backup · Fase 6: MS Project/Excel)

Programa Python executado no PC Windows pelo Agendador de Tarefas (ver ADR 0002).

Responsabilidades previstas:
- ler cronogramas `.mpp` via COM (pywin32), reaproveitando `msproject_mpp.py` do motor de retomada da PRF
- ler planilhas `.xlsx` (openpyxl) conforme modelos de importação cadastrados
- indexar pastas de obras (metadados, sem cópia)
- executar `pg_dump` e gravar o backup numa pasta do Google Drive

Regras: só envia dados estruturados ao Supabase; nunca altera nem move arquivos de origem; registra cada execução em `sync_execucoes`.
