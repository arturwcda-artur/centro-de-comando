-- 0033 — Notion sai do sistema (decisão do proprietário em 13/11/2026, ADR 0024)
-- Nada é apagado: as tarefas que vieram do Notion ficam como manuais, e o conector fica inativo.

update public.tarefas
   set fonte = 'manual', status_sync = 'local'
 where fonte = 'notion';

update public.conectores
   set ativo = false
 where ferramenta = 'notion';
