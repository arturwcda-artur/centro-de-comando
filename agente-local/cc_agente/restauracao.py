"""Teste de restauração do backup em um banco descartável (SECURITY.md · Fase 11).

Restaura o backup mais recente em um PostgreSQL em memória neste computador e compara
a quantidade de linhas de cada tabela com a nuvem. Só lê a nuvem, e os arquivos temporários são apagados no fim.

Execução: py -m cc_agente.restauracao
"""
from __future__ import annotations

import json
import logging
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from cc_agente.backup import EXTENSAO, PREFIXO, caminho_config, interpretar_url, ler_config

SCRIPT = Path(__file__).resolve().parents[2] / "packages" / "db" / "scripts" / "restaurar-backup.mjs"
CONSULTA_TABELAS = """
select schemaname, tablename from pg_tables
where schemaname in ('public', 'app') order by 1, 2
"""
# A auditoria e o histórico de sincronização crescem enquanto o teste roda
TABELAS_QUE_CRESCEM = {"app.auditoria", "public.sync_execucoes", "public.sync_itens"}

log = logging.getLogger("cc_agente.restauracao")


def backup_mais_recente(pasta: Path) -> Path:
    arquivos = sorted(pasta.glob(f"{PREFIXO}*{EXTENSAO}"), key=lambda p: p.name)
    if not arquivos:
        raise FileNotFoundError(f"Nenhum backup em {pasta}")
    return arquivos[-1]


def comparar(nuvem: dict[str, int], restaurado: dict[str, int]) -> dict[str, list]:
    """Separa tabelas ausentes, diferenças reais e diferenças esperadas por terem crescido depois do backup."""
    ausentes = sorted(set(nuvem) - set(restaurado))
    diferentes, cresceram = [], []
    for tabela in sorted(set(nuvem) & set(restaurado)):
        if nuvem[tabela] == restaurado[tabela]:
            continue
        linha = (tabela, nuvem[tabela], restaurado[tabela])
        (cresceram if tabela in TABELAS_QUE_CRESCEM and nuvem[tabela] > restaurado[tabela] else diferentes).append(linha)
    return {"ausentes": ausentes, "diferentes": diferentes, "cresceram": cresceram}


def contar(conexao) -> dict[str, int]:
    from psycopg import sql

    contagens = {}
    with conexao.cursor() as cur:
        cur.execute(CONSULTA_TABELAS)
        for esquema, tabela in cur.fetchall():
            cur.execute(sql.SQL("select count(*) from {}.{}").format(sql.Identifier(esquema), sql.Identifier(tabela)))
            contagens[f"{esquema}.{tabela}"] = cur.fetchone()[0]
    return contagens


def rodar(comando: list[str], **opcoes) -> subprocess.CompletedProcess:
    return subprocess.run(comando, capture_output=True, text=True, encoding="utf-8", errors="replace", **opcoes)


def restaurar(pg_restore: str, backup: Path, pasta: Path) -> dict:
    """O backup vira SQL e é carregado em um PostgreSQL em memória, que some ao terminar."""
    antes, depois = pasta / "antes.sql", pasta / "depois.sql"
    base = [pg_restore, "--no-owner", "--no-privileges"]
    for secoes, destino in ((["--section", "pre-data", "--section", "data"], antes), (["--section", "post-data"], depois)):
        r = rodar([*base, *secoes, "--file", str(destino), str(backup)])
        if r.returncode:
            raise RuntimeError(f"pg_restore falhou: {r.stderr[-300:]}")
    node = shutil.which("node") or shutil.which("node.exe")
    if not node:
        raise RuntimeError("Node não encontrado")
    r = rodar([node, str(SCRIPT), str(antes), str(depois)])
    if r.returncode:
        raise RuntimeError(f"Restauração falhou: {r.stderr[-600:]}")
    return json.loads(r.stdout.strip().splitlines()[-1])


def main() -> int:
    import psycopg

    arquivo_config = caminho_config()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", handlers=[logging.StreamHandler(), logging.FileHandler(arquivo_config.parent / "restauracao.log", encoding="utf-8")])
    config = ler_config(arquivo_config)
    backup = backup_mais_recente(Path(config["BACKUP_DIR"]))
    pg_restore = str(Path(config.get("PG_DUMP", "pg_dump")).with_name("pg_restore.exe"))
    log.info("Restaurando %s", backup.name)

    pasta = Path(tempfile.mkdtemp(prefix="cc_restauracao_"))
    try:
        resultado = restaurar(pg_restore, backup, pasta)
    finally:
        shutil.rmtree(pasta, ignore_errors=True)
    restaurado = resultado["contagens"]

    con = interpretar_url(config["SUPABASE_DB_URL"], config.get("SUPABASE_DB_PASSWORD"))
    with psycopg.connect(host=con.host, port=con.porta, user=con.usuario, password=con.senha, dbname=con.banco, sslmode="require", autocommit=True, options="-c default_transaction_read_only=on") as conexao:
        nuvem = contar(conexao)

    r = comparar(nuvem, restaurado)
    for tabela, n, b in r["cresceram"]:
        log.info("Cresceu depois do backup: %s (nuvem %s, backup %s)", tabela, n, b)
    for tabela, n, b in r["diferentes"]:
        log.warning("Diferente: %s (nuvem %s, backup %s)", tabela, n, b)
    for tabela in r["ausentes"]:
        log.warning("Ausente no backup: %s", tabela)
    log.info("Tabelas: %s. Linhas: %s. Chaves estrangeiras: %s. Políticas: %s. Diferentes: %s. Ausentes: %s.", len(restaurado), sum(restaurado.values()), resultado["restricoes"], resultado["politicas"], len(r["diferentes"]), len(r["ausentes"]))
    return 1 if r["diferentes"] or r["ausentes"] else 0


if __name__ == "__main__":
    sys.exit(main())
