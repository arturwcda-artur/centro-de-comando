"""Leitura das planilhas de medição (ADR 0016).

Lê com openpyxl, sem abrir o Excel e sem alterar o arquivo, e envia ao banco por funções restritas.
Só relê a planilha que mudou. Cada modelo de planilha é uma função em MODELOS.

Configuração em agente.env: a mesma de cronogramas.py.
Execução: py -m cc_agente.medicoes
"""
from __future__ import annotations

import hashlib
import json
import logging
import sys
import unicodedata
import warnings
from datetime import date, datetime
from pathlib import Path

from cc_agente.backup import caminho_config, ler_config
from cc_agente.cronogramas import conectar, sha256_arquivo, validar_config

LINHA_NUMERO, LINHA_DATA, LINHA_INICIO, LINHA_FIM, LINHA_CABECALHO = 2, 3, 4, 5, 12  # índices a partir de zero
COL_ITEM, COL_DESCRICAO, COL_QTD, COL_UN, COL_PRECO, COL_TOTAL, COL_MED = 0, 2, 3, 4, 5, 6, 9

log = logging.getLogger("cc_agente.medicoes")


def _sem_acento(texto) -> str:
    return unicodedata.normalize("NFD", str(texto or "")).encode("ascii", "ignore").decode().strip().lower()


def _numero(valor) -> float:
    return float(valor) if isinstance(valor, (int, float)) and not isinstance(valor, bool) else 0.0


def _data(valor) -> str | None:
    return valor.strftime("%Y-%m-%d") if isinstance(valor, (datetime, date)) else None


def _celula(linha, coluna):
    return linha[coluna] if coluna < len(linha) else None


def _codigo(valor) -> str:
    return str(int(valor)) if isinstance(valor, float) and valor.is_integer() else str(valor).strip()


def _validar_cabecalho(linhas) -> None:
    if len(linhas) <= LINHA_CABECALHO:
        raise ValueError("Planilha fora do modelo: cabeçalho não encontrado")
    c = linhas[LINHA_CABECALHO]
    ok = _sem_acento(_celula(c, COL_ITEM)) == "item" and _sem_acento(_celula(c, COL_DESCRICAO)).startswith("descricao") and _sem_acento(_celula(c, COL_MED)) == "med.00"
    if not ok:
        raise ValueError("Planilha fora do modelo: cabeçalho diferente do esperado")


def ler_mascara_medicoes(caminho: Path | str) -> dict:
    """Modelo da PRF: aba Medições, com uma coluna por medição a partir da coluna J (MED.00)."""
    wb = openpyxl_abrir(caminho)
    try:
        aba = next((w for w in wb.worksheets if _sem_acento(w.title) == "medicoes"), None)
        if aba is None:
            raise ValueError("Planilha fora do modelo: aba Medições não encontrada")
        linhas = list(aba.iter_rows(values_only=True))
    finally:
        wb.close()
    _validar_cabecalho(linhas)

    servicos = []
    for linha in linhas[LINHA_CABECALHO + 1:]:
        item, descricao = _celula(linha, COL_ITEM), _celula(linha, COL_DESCRICAO)
        if item is None or not str(descricao or "").strip() or descricao == 0:
            continue
        servicos.append(linha)

    itens = [{
        "item": _codigo(s[COL_ITEM]),
        "descricao": str(s[COL_DESCRICAO]).strip(),
        "unidade": s[COL_UN],
        "quantidade": s[COL_QTD] if isinstance(s[COL_QTD], (int, float)) else 0,
        "preco_unitario": _numero(s[COL_PRECO]),
        "valor_total": _numero(s[COL_TOTAL]),
    } for s in servicos]

    medicoes = []
    cabecalho = linhas[LINHA_CABECALHO]
    for coluna in range(COL_MED, len(cabecalho)):
        if not _sem_acento(cabecalho[coluna]).startswith("med."):
            continue
        numero = _celula(linhas[LINHA_NUMERO], coluna)
        inicio, fim = _data(_celula(linhas[LINHA_INICIO], coluna)), _data(_celula(linhas[LINHA_FIM], coluna))
        if not inicio or not fim or not _numero(numero):
            continue
        medidos = []
        bruto = 0.0
        for s in servicos:
            quantidade = _numero(_celula(s, coluna))
            if quantidade:
                # A planilha arredonda cada serviço antes de somar; o total precisa bater com ela
                valor = round(quantidade * _numero(s[COL_PRECO]), 2)
                bruto += valor
                medidos.append({"item": _codigo(s[COL_ITEM]), "quantidade": quantidade if quantidade % 1 else int(quantidade), "valor": valor})
        conteudo = json.dumps(medidos, sort_keys=True).encode()
        medicoes.append({
            "numero": int(numero),
            "data": _data(_celula(linhas[LINHA_DATA], coluna)),
            "periodo_inicio": inicio,
            "periodo_fim": fim,
            "valor_bruto": round(bruto, 2),
            "hash": hashlib.sha256(conteudo).hexdigest()[:32],
            "itens": medidos,
        })
    return {"itens": itens, "medicoes": medicoes}


def openpyxl_abrir(caminho):
    import openpyxl

    # Validações de dados do Excel não interessam à leitura e geram aviso a cada arquivo
    warnings.filterwarnings("ignore", category=UserWarning, module="openpyxl")
    return openpyxl.load_workbook(caminho, read_only=True, data_only=True)


MODELOS = {"mascara_medicoes": ler_mascara_medicoes}


def processar(arquivos, banco) -> dict:
    """Lê as planilhas que mudaram. A falha de uma não interrompe as outras."""
    resumo = {"lidos": 0, "iguais": 0, "erros": 0}
    for a in arquivos:
        caminho = Path(a["caminho"])
        if not caminho.is_file():
            banco.registrar_erro(a["id"], "Arquivo não encontrado")
            resumo["erros"] += 1
            continue
        try:
            hash_atual = sha256_arquivo(caminho)
            if hash_atual == a["ultimo_hash"]:
                resumo["iguais"] += 1
                continue
            ler = MODELOS.get(a["modelo"])
            if ler is None:
                raise ValueError(f"Modelo de planilha desconhecido: {a['modelo']}")
            banco.importar({**ler(caminho), "arquivo_id": a["id"], "hash": hash_atual})
            resumo["lidos"] += 1
        except Exception as e:  # noqa: BLE001 - segue para a próxima planilha
            log.warning("Falha ao ler %s: %s", caminho.name, e)
            banco.registrar_erro(a["id"], str(e))
            resumo["erros"] += 1
    return resumo


class Banco:
    def __init__(self, conexao):
        self.conexao = conexao

    def listar(self) -> list[dict]:
        with self.conexao.cursor() as cur:
            cur.execute("select id::text, caminho, modelo, ultimo_hash from public.listar_medicoes_agente()")
            return [{"id": i, "caminho": c, "modelo": m, "ultimo_hash": h} for i, c, m, h in cur.fetchall()]

    def importar(self, payload: dict) -> None:
        with self.conexao.cursor() as cur:
            cur.execute("select public.importar_medicoes(%s::jsonb)", (json.dumps(payload),))

    def registrar_erro(self, arquivo_id: str, mensagem: str) -> None:
        with self.conexao.cursor() as cur:
            cur.execute("select public.registrar_erro_medicao(%s, %s)", (arquivo_id, mensagem))


def main() -> int:
    arquivo_config = caminho_config()
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[logging.StreamHandler(), logging.FileHandler(arquivo_config.parent / "medicoes.log", encoding="utf-8")],
    )
    try:
        config = ler_config(arquivo_config)
        validar_config(config)
        with conectar(config) as conexao:
            banco = Banco(conexao)
            resumo = processar(banco.listar(), banco)
    except Exception as e:  # noqa: BLE001 - a mensagem final precisa aparecer para o usuário
        log.error("Falha: %s", e)
        return 1
    log.info("Medições. Lidas: %s. Sem mudança: %s. Com erro: %s.", resumo["lidos"], resumo["iguais"], resumo["erros"])
    return 1 if resumo["erros"] else 0


if __name__ == "__main__":
    sys.exit(main())
