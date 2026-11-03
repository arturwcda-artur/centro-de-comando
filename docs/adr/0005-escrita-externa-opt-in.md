# ADR 0005 — Gravação externa desligada por padrão
**Status:** Aceita · **Data:** 2026-11-03

## Contexto
O proprietário exigiu que nenhuma ferramenta seja alterada sem autorização.

## Decisão
Conectores nascem em modo leitura. O modo leitura_escrita só é aceito pelo banco com escrita_autorizada_em preenchido (CHECK em conectores).

## Consequências
Garantia verificável pelo próprio banco, não só pela aplicação.
