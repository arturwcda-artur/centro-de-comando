"""Backup do banco do Centro de Comando com pg_dump (SECURITY.md · ADR 0002).

Uso:  python -m cc_agente.backup            (executado pelo Agendador de Tarefas do Windows)

Configuração (fora do repositório): %LOCALAPPDATA%\\CentroDeComando\\agente.env
    SUPABASE_DB_URL=postgresql://postgres.<ref>:<senha>@<host>:5432/postgres
    BACKUP_DIR=C:\\...\\pasta sincronizada pelo Google Drive
    BACKUP_MANTER=8            (opcional; quantos backups manter)
    PG_DUMP=C:\\...\\pg_dump.exe (opcional; padrão: pg_dump no PATH)

A senha nunca vai para a linha de comando (fica visível na lista de processos): é passada
ao pg_dump pela variável de ambiente PGPASSWORD. A retenção só remove arquivos criados por
este script (padrão cc_backup_*.dump) na pasta de backup.
"""
from __future__ import annotations

import logging
import os
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote, urlsplit
from zoneinfo import ZoneInfo

FUSO = ZoneInfo("America/Sao_Paulo")
PREFIXO = "cc_backup_"
EXTENSAO = ".dump"
MANTER_PADRAO = 8

log = logging.getLogger("cc_agente.backup")


@dataclass(frozen=True)
class Conexao:
    host: str
    porta: int
    usuario: str
    senha: str
    banco: str


def caminho_config() -> Path:
    base = os.environ.get("LOCALAPPDATA") or str(Path.home() / "AppData" / "Local")
    return Path(base) / "CentroDeComando" / "agente.env"


def ler_config(caminho: Path) -> dict[str, str]:
    """Lê um arquivo CHAVE=valor simples (linhas vazias e # são ignoradas)."""
    config: dict[str, str] = {}
    for linha in caminho.read_text(encoding="utf-8").splitlines():
        linha = linha.strip()
        if not linha or linha.startswith("#") or "=" not in linha:
            continue
        chave, valor = linha.split("=", 1)
        config[chave.strip()] = valor.strip().strip('"').strip("'")
    return config


def interpretar_url(url: str) -> Conexao:
    partes = urlsplit(url)
    if partes.scheme not in ("postgres", "postgresql") or not partes.hostname:
        raise ValueError("SUPABASE_DB_URL inválida: esperado postgresql://usuario:senha@host:porta/banco")
    if not partes.password:
        raise ValueError("SUPABASE_DB_URL sem senha")
    return Conexao(
        host=partes.hostname,
        porta=partes.port or 5432,
        usuario=unquote(partes.username or "postgres"),
        senha=unquote(partes.password),
        banco=(partes.path.lstrip("/") or "postgres"),
    )


def nome_arquivo(agora: datetime) -> str:
    return f"{PREFIXO}{agora.astimezone(FUSO):%Y-%m-%d_%H%M}{EXTENSAO}"


def montar_comando(pg_dump: str, con: Conexao, destino: Path) -> list[str]:
    return [
        pg_dump,
        "--host", con.host,
        "--port", str(con.porta),
        "--username", con.usuario,
        "--dbname", con.banco,
        "--format", "custom",
        "--no-owner",
        "--no-privileges",
        "--schema", "public",
        "--schema", "app",
        "--file", str(destino),
    ]


def backups_a_remover(pasta: Path, manter: int) -> list[Path]:
    """Backups deste script além dos `manter` mais recentes (pela data no nome)."""
    if manter < 1:
        raise ValueError("BACKUP_MANTER deve ser >= 1")
    nossos = sorted(
        (p for p in pasta.glob(f"{PREFIXO}*{EXTENSAO}") if p.is_file()),
        key=lambda p: p.name,
        reverse=True,
    )
    return nossos[manter:]


def executar(config: dict[str, str], agora: datetime | None = None, rodar=subprocess.run) -> Path:
    url = config.get("SUPABASE_DB_URL")
    pasta = config.get("BACKUP_DIR")
    if not url or not pasta:
        raise ValueError("Configure SUPABASE_DB_URL e BACKUP_DIR em " + str(caminho_config()))
    con = interpretar_url(url)
    pasta_backup = Path(pasta)
    pasta_backup.mkdir(parents=True, exist_ok=True)

    destino = pasta_backup / nome_arquivo(agora or datetime.now(FUSO))
    parcial = destino.with_suffix(EXTENSAO + ".parcial")
    comando = montar_comando(config.get("PG_DUMP", "pg_dump"), con, parcial)
    ambiente = {**os.environ, "PGPASSWORD": con.senha, "PGSSLMODE": "require"}

    log.info("Iniciando backup em %s", destino)
    resultado = rodar(comando, env=ambiente, capture_output=True, text=True)
    if resultado.returncode != 0:
        parcial.unlink(missing_ok=True)
        raise RuntimeError(f"pg_dump falhou (código {resultado.returncode}): {resultado.stderr.strip()}")
    parcial.replace(destino)  # só aparece com o nome final quando completo
    log.info("Backup concluído: %s (%d bytes)", destino.name, destino.stat().st_size)

    for antigo in backups_a_remover(pasta_backup, int(config.get("BACKUP_MANTER", MANTER_PADRAO))):
        antigo.unlink()
        log.info("Backup antigo removido pela retenção: %s", antigo.name)
    return destino


def main() -> int:
    cfg_path = caminho_config()
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[logging.StreamHandler(), logging.FileHandler(cfg_path.with_name("backup.log"), encoding="utf-8")]
        if cfg_path.parent.exists() else [logging.StreamHandler()],
    )
    try:
        executar(ler_config(cfg_path))
        return 0
    except Exception as erro:  # registrado para o Agendador de Tarefas
        log.error("Backup NÃO realizado: %s", erro)
        return 1


if __name__ == "__main__":
    sys.exit(main())
