"""Inventário das pastas de obras → propostas para a importação assistida (Fase 4, RN-04).

Somente LEITURA das pastas: não abre conteúdo de arquivos, não move, não altera nada.
Gera propostas (nome, código, situação sugeridos e evidências); o proprietário revisa cada
uma na tela "Importação assistida" antes de qualquer obra existir no sistema.

Uso:
    py -m cc_agente.inventario_obras "C:\\...\\GESTÃO_DE_OBRAS\\2.0-OBRAS" --json propostas.json
    py -m cc_agente.inventario_obras "C:\\...\\2.0-OBRAS" --sql propostas.sql   (upsert idempotente)
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path

# Pasta de situação → situação sugerida
SITUACOES = {
    "2.1-EM ANDAMENTO": "andamento",
    "2.2-AGUARDANDO": "aguardando",
    "2.3-FINALIZADAS": "concluida",
}
# Pastas que agrupam várias frentes de obra: cada subpasta vira uma proposta
AGRUPADORAS = {"LEVORSSE"}
# Pastas que provavelmente não são obras (ficam marcadas, o proprietário decide)
PROVAVEIS_NAO_OBRAS = {"PEDIDOS GERAIS"}
# Pistas de contratante por palavra no nome da pasta — apenas sugestão, nunca decisão
PISTAS = [
    (r"\bPRF\b", "Polícia Rodoviária Federal (PRF)"),
    (r"PRODASEN", "Senado Federal (Prodasen)"),
    (r"SENADO", "Senado Federal"),
    (r"\bANP\b", "ANP"),
    (r"\bTCDF\b", "TCDF"),
    (r"CANDANGOL", "SEEDF (Candangolândia)"),
]
IGNORAR = {"thumbs.db", "desktop.ini", ".ds_store"}
PLANILHAS = {".xlsx", ".xls", ".xlsm", ".csv"}


@dataclass
class Proposta:
    id_externo: str
    pasta_local: str
    nome_sugerido: str
    codigo_sugerido: str
    situacao_sugerida: str
    pista_contratante: str | None = None
    observacao: str | None = None
    provavel_nao_obra: bool = False
    qtd_arquivos: int = 0
    qtd_cronogramas: int = 0
    qtd_planilhas: int = 0
    qtd_pdfs: int = 0
    tamanho_bytes: int = 0
    ultima_modificacao: str | None = None
    estrutura_padrao: bool = False
    subpastas: list[str] = field(default_factory=list)


def codigo_de(nome: str) -> str:
    sem_acento = unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode()
    return re.sub(r"[^A-Z0-9]+", "-", sem_acento.upper()).strip("-")[:30] or "OBRA"


def nome_de(nome: str) -> str:
    return re.sub(r"\s+", " ", nome.replace("_", " ")).strip()


def pista_de(nome: str) -> str | None:
    alvo = unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode().upper()
    for padrao, pista in PISTAS:
        if re.search(padrao, alvo):
            return pista
    return None


def _arquivo_valido(p: Path) -> bool:
    return p.is_file() and p.name.lower() not in IGNORAR and not p.name.startswith("~$")


def evidencias(pasta: Path) -> dict:
    arquivos = [p for p in pasta.rglob("*") if _arquivo_valido(p)]
    sufixo = lambda p: p.suffix.lower()  # noqa: E731
    mtimes = [p.stat().st_mtime for p in arquivos]
    subpastas = sorted(p.name for p in pasta.iterdir() if p.is_dir())
    padrao = sum(1 for s in subpastas if re.match(r"^(0[1-9]|1[0-5])[_\s-]", s))
    return {
        "qtd_arquivos": len(arquivos),
        "qtd_cronogramas": sum(1 for p in arquivos if sufixo(p) == ".mpp"),
        "qtd_planilhas": sum(1 for p in arquivos if sufixo(p) in PLANILHAS),
        "qtd_pdfs": sum(1 for p in arquivos if sufixo(p) == ".pdf"),
        "tamanho_bytes": sum(p.stat().st_size for p in arquivos),
        "ultima_modificacao": datetime.fromtimestamp(max(mtimes), timezone.utc).isoformat() if mtimes else None,
        "estrutura_padrao": padrao >= 8,
        "subpastas": subpastas[:25],
    }


def _proposta(base: Path, pasta: Path, situacao: str, nome: str, observacao: str | None = None) -> Proposta:
    nome_pasta = pasta.name.strip()
    return Proposta(
        id_externo=pasta.relative_to(base).as_posix(),
        pasta_local=str(pasta),
        nome_sugerido=nome,
        codigo_sugerido=codigo_de(nome),
        situacao_sugerida=situacao,
        pista_contratante=pista_de(nome_pasta),
        observacao=observacao,
        provavel_nao_obra=nome_pasta.upper() in PROVAVEIS_NAO_OBRAS,
        **evidencias(pasta),
    )


def inventariar(base: Path) -> list[Proposta]:
    propostas: list[Proposta] = []
    for grupo, situacao in SITUACOES.items():
        raiz = base / grupo
        if not raiz.is_dir():
            continue
        for pasta in sorted(p for p in raiz.iterdir() if p.is_dir()):
            nome = nome_de(pasta.name)
            if pasta.name.upper() in AGRUPADORAS:
                frentes = sorted(p for p in pasta.iterdir() if p.is_dir())
                for frente in frentes:
                    propostas.append(
                        _proposta(base, frente, situacao, f"{nome} — {nome_de(frente.name)}", f"Frente da pasta {pasta.name}; separar ou unir ao aprovar.")
                    )
                continue
            propostas.append(_proposta(base, pasta, situacao, nome))
    return _codigos_unicos(propostas)


def _codigos_unicos(propostas: list[Proposta]) -> list[Proposta]:
    """O código da obra é único no banco: repetições recebem a situação como sufixo (ex.: MIRANTE-CONCLUIDA)."""
    vistos: set[str] = set()
    for p in propostas:
        if p.codigo_sugerido in vistos:
            p.codigo_sugerido = f"{p.codigo_sugerido}-{p.situacao_sugerida.upper()}"[:30]
            p.observacao = ((p.observacao or "") + " Código ajustado: já existe outra pasta com o mesmo nome.").strip()
        vistos.add(p.codigo_sugerido)
    return propostas


def _literal(valor) -> str:
    if valor is None:
        return "null"
    if isinstance(valor, bool):
        return "true" if valor else "false"
    if isinstance(valor, int):
        return str(valor)
    if isinstance(valor, list):
        return "array[" + ",".join(_literal(v) for v in valor) + "]::text[]" if valor else "'{}'::text[]"
    return "'" + str(valor).replace("'", "''") + "'"


COLUNAS = [
    "id_externo", "pasta_local", "nome_sugerido", "codigo_sugerido", "situacao_sugerida", "pista_contratante",
    "observacao", "provavel_nao_obra", "qtd_arquivos", "qtd_cronogramas", "qtd_planilhas", "qtd_pdfs",
    "tamanho_bytes", "ultima_modificacao", "estrutura_padrao", "subpastas",
]
# Ao reler uma pasta, atualiza só as evidências; sugestões e revisão do proprietário são preservadas
ATUALIZAVEIS = ["pasta_local", "qtd_arquivos", "qtd_cronogramas", "qtd_planilhas", "qtd_pdfs", "tamanho_bytes", "ultima_modificacao", "estrutura_padrao", "subpastas"]


def para_sql(propostas: list[Proposta]) -> str:
    linhas = [
        "(" + ", ".join(_literal(asdict(p)[c]) for c in COLUNAS) + ")" for p in propostas
    ]
    return (
        "insert into public.importacao_obras (" + ", ".join(COLUNAS) + ") values\n  "
        + ",\n  ".join(linhas)
        + "\non conflict (fonte, id_externo) do update set "
        + ", ".join(f"{c} = excluded.{c}" for c in ATUALIZAVEIS)
        + ", importado_em = now();\n"
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("base", type=Path, help="pasta 2.0-OBRAS")
    parser.add_argument("--json", type=Path, help="grava as propostas em JSON")
    parser.add_argument("--sql", type=Path, help="grava o upsert SQL das propostas")
    args = parser.parse_args(argv)
    if not args.base.is_dir():
        print(f"Pasta não encontrada: {args.base}", file=sys.stderr)
        return 1
    propostas = inventariar(args.base)
    if args.json:
        args.json.write_text(json.dumps([asdict(p) for p in propostas], ensure_ascii=False, indent=2), encoding="utf-8")
    if args.sql:
        args.sql.write_text(para_sql(propostas), encoding="utf-8")
    for p in propostas:
        marca = " (provável não-obra)" if p.provavel_nao_obra else ""
        print(f"{p.situacao_sugerida:<11} {p.codigo_sugerido:<30} {p.qtd_arquivos:>5} arq{marca}")
    print(f"{len(propostas)} propostas")
    return 0


if __name__ == "__main__":
    sys.exit(main())
