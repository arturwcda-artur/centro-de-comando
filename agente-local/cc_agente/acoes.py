"""Leitura do plano de ações da obra na Central de Gestão (ADR 0022, RN-49e).

Lê a aba AÇÕES com openpyxl, sem abrir o Excel e sem alterar o arquivo, e envia ao banco por funções
restritas. Só relê a planilha que mudou. As colunas são achadas pelo nome do cabeçalho (linha 5), então
acrescentar ou mover colunas não quebra a leitura. Nº e GUT são recalculados aqui, porque uma planilha
salva fora do Excel não guarda o resultado das fórmulas.

Configuração em agente.env: a mesma de cronogramas.py.
Execução: py -m cc_agente.acoes
"""
from __future__ import annotations

import hashlib
import json
import logging
import re
import sys
from datetime import date, datetime
from pathlib import Path

from cc_agente.backup import caminho_config, ler_config
from cc_agente.cronogramas import conectar, registrar_execucao, sha256_arquivo, validar_config
from cc_agente.medicoes import _sem_acento, openpyxl_abrir

LINHA_CABECALHO = 5  # linha do Excel (1 = primeira)
GUT_CRITICO = 64

# nome do cabeçalho sem acento, em minúsculas → chave interna. "inicio" = o cabeçalho começa com o texto.
CABECALHOS = {
    "o que fazer": "o_que",
    "tipo": "tipo",
    "servico (eap)": "eap",
    "responsavel": "responsavel",
    "prazo": "prazo",
    "status": "status",
    "concluida em": "concluida_em",
    "historico": "historico",
    "frente": "frente",
    "por que": "por_que",
    "onde": "onde",
    "como": "como",
    "quanto": "quanto",
    "depende": "depende",
    "libera": "libera",
    "g": "g",
    "u": "u",
    "t": "t",
    "etapa pdca": "pdca",
    "evidencia": "evidencia",
    "prazo original": "prazo_original",
}
OBRIGATORIAS = ("o_que", "responsavel", "prazo", "status")

STATUS = {
    "aberta": "a_fazer",
    "em andamento": "em_andamento",
    "aguardando terceiro": "aguardando_terceiro",
    "concluida": "concluida",
    "cancelada": "cancelada",
}
PREFIXOS_NOME = ("eng.", "eng", "arq.", "arq", "dr.", "dra.", "sr.", "sra.")

log = logging.getLogger("cc_agente.acoes")


def _texto(valor) -> str:
    if valor is None:
        return ""
    if isinstance(valor, float) and valor.is_integer():
        return str(int(valor))
    return str(valor).strip()


def _data(valor) -> str | None:
    if isinstance(valor, (datetime, date)):
        return valor.strftime("%Y-%m-%d")
    try:
        return datetime.strptime(_texto(valor), "%d/%m/%Y").strftime("%Y-%m-%d")
    except ValueError:
        return None


def _nota(valor) -> int | None:
    if isinstance(valor, bool):
        return None
    if isinstance(valor, (int, float)) and 1 <= valor <= 5:
        return int(valor)
    return None


def chave_pessoa(nome: str) -> str:
    """Primeiro nome, sem título nem parênteses: "Eng. Adamo (obra)" → "adamo"."""
    base = re.sub(r"\(.*?\)", " ", _sem_acento(nome))
    palavras = [p for p in base.split() if p not in PREFIXOS_NOME]
    return palavras[0] if palavras else ""


def numeros(valor) -> list[str]:
    return sorted({str(int(n)) for n in re.findall(r"\d+", _texto(valor))}, key=int)


def _mapear_colunas(cabecalho) -> dict[str, int]:
    """Primeiro o nome exato; depois o início do texto ("Por quê (problema...)"), sem tomar a coluna
    que tem nome exato de outra ("Prazo original" nunca vira "Prazo")."""
    nomes = [_sem_acento(v) for v in cabecalho]
    colunas: dict[str, int] = {}
    for i, nome in enumerate(nomes):
        chave = CABECALHOS.get(nome)
        if chave and chave not in colunas:
            colunas[chave] = i
    usadas = set(colunas.values())
    for i, nome in enumerate(nomes):
        if not nome or i in usadas or nome in CABECALHOS:
            continue
        for rotulo, chave in CABECALHOS.items():
            if len(rotulo) > 1 and chave not in colunas and nome.startswith(rotulo):
                colunas[chave] = i
                usadas.add(i)
                break
    faltam = [c for c in OBRIGATORIAS if c not in colunas]
    if faltam:
        raise ValueError(f"Planilha fora do modelo: faltam as colunas {', '.join(faltam)} na aba AÇÕES")
    return colunas


def _descricao(v: dict) -> str:
    partes = [
        ("Responsável na planilha", v["responsavel"]),
        ("Frente", v["frente"]),
        ("Por quê", v["por_que"]),
        ("Onde", v["onde"]),
        ("Como", v["como"]),
        ("Quanto", v["quanto"]),
        ("Depende das ações", v["depende"]),
        ("Libera", v["libera"]),
        ("GUT", v["gut_texto"]),
        ("Etapa PDCA", v["pdca"]),
        ("Evidência de conclusão", v["evidencia"]),
        ("Prazo original", v["prazo_original_texto"]),
        ("Histórico", v["historico"]),
    ]
    return "\n".join(f"{r}: {x}" for r, x in partes if x)


def ler_plano_de_acoes(caminho: Path | str) -> dict:
    wb = openpyxl_abrir(caminho)
    try:
        aba = next((w for w in wb.worksheets if _sem_acento(w.title) == "acoes"), None)
        if aba is None:
            raise ValueError("Planilha fora do modelo: aba AÇÕES não encontrada")
        linhas = list(aba.iter_rows(values_only=True))
    finally:
        wb.close()
    if len(linhas) < LINHA_CABECALHO:
        raise ValueError("Planilha fora do modelo: cabeçalho não encontrado")
    col = _mapear_colunas(linhas[LINHA_CABECALHO - 1])

    def cel(linha, chave):
        i = col.get(chave)
        return linha[i] if i is not None and i < len(linha) else None

    acoes = []
    for indice, linha in enumerate(linhas[LINHA_CABECALHO:], start=LINHA_CABECALHO + 1):
        o_que = _texto(cel(linha, "o_que"))
        if not o_que:
            continue
        numero = indice - LINHA_CABECALHO  # mesma regra da fórmula =ROW()-5 da coluna Nº
        status_planilha = _sem_acento(cel(linha, "status")) or "aberta"
        status = STATUS.get(status_planilha)
        if status is None:
            raise ValueError(f"Ação {numero}: status '{_texto(cel(linha, 'status'))}' desconhecido")
        g, u, t = (_nota(cel(linha, k)) for k in ("g", "u", "t"))
        gut = g * u * t if g and u and t else None
        responsavel = _texto(cel(linha, "responsavel"))
        frente = _texto(cel(linha, "frente"))
        tipo_planilha = _sem_acento(cel(linha, "tipo"))
        v = {
            "responsavel": responsavel,
            "frente": frente,
            "por_que": _texto(cel(linha, "por_que")),
            "onde": _texto(cel(linha, "onde")),
            "como": _texto(cel(linha, "como")),
            "quanto": _texto(cel(linha, "quanto")),
            "depende": _texto(cel(linha, "depende")),
            "libera": _texto(cel(linha, "libera")),
            "gut_texto": f"{gut} (G{g} × U{u} × T{t})" if gut else "",
            "pdca": _texto(cel(linha, "pdca")),
            "evidencia": _texto(cel(linha, "evidencia")),
            "prazo_original_texto": _texto(_data(cel(linha, "prazo_original")) and datetime.strptime(_data(cel(linha, "prazo_original")), "%Y-%m-%d").strftime("%d/%m/%Y")),
            "historico": _texto(cel(linha, "historico")),
        }
        acao = {
            "numero": numero,
            "titulo": f"[{numero}] {o_que}"[:500],
            "descricao": _descricao(v),
            "tipo": "pendencia" if tipo_planilha.startswith("restricao") else "acao",
            "categoria": " · ".join(x for x in ("Plano de ações", frente, responsavel) if x),
            "responsavel_chave": chave_pessoa(responsavel),
            "prazo": _data(cel(linha, "prazo")),
            "status": status,
            "concluida_em": _data(cel(linha, "concluida_em")) if status == "concluida" else None,
            "importancia": g or 3,
            "impacto": t or 3,
            "critica": bool(gut and gut >= GUT_CRITICO),
            "depende": [n for n in numeros(cel(linha, "depende")) if int(n) != numero],
        }
        acao["hash"] = hashlib.sha256(json.dumps(acao, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:32]
        acoes.append(acao)
    return {"acoes": acoes}


def processar(arquivos, banco) -> dict:
    """Lê as planilhas que mudaram. A falha de uma não interrompe as outras."""
    resumo = {"lidos": 0, "iguais": 0, "erros": 0, "mensagens": []}
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
            retorno = banco.importar({**ler_plano_de_acoes(caminho), "arquivo_id": a["id"], "hash": hash_atual})
            resumo["lidos"] += 1
            resumo["mensagens"].append(f"{caminho.name}: {retorno}")
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
            cur.execute("select id::text, caminho, ultimo_hash from public.listar_acoes_agente()")
            return [{"id": i, "caminho": c, "ultimo_hash": h} for i, c, h in cur.fetchall()]

    def importar(self, payload: dict) -> str:
        with self.conexao.cursor() as cur:
            cur.execute("select public.importar_acoes(%s::jsonb)", (json.dumps(payload, ensure_ascii=False),))
            return cur.fetchone()[0]

    def registrar_erro(self, arquivo_id: str, mensagem: str) -> None:
        with self.conexao.cursor() as cur:
            cur.execute("select public.registrar_erro_acoes(%s, %s)", (arquivo_id, mensagem))


def main() -> int:
    arquivo_config = caminho_config()
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[logging.StreamHandler(), logging.FileHandler(arquivo_config.parent / "acoes.log", encoding="utf-8")],
    )
    try:
        config = ler_config(arquivo_config)
        validar_config(config)
        with conectar(config) as conexao:
            banco = Banco(conexao)
            resumo = processar(banco.listar(), banco)
            detalhe = "; ".join(resumo["mensagens"])
            registrar_execucao(conexao, "excel", resumo["lidos"], resumo["iguais"], resumo["erros"], f"Plano de ações: {resumo['lidos']} lidas, {resumo['iguais']} sem mudança. {detalhe}".strip())
    except Exception as e:  # noqa: BLE001 - a mensagem final precisa aparecer para o usuário
        log.error("Falha: %s", e)
        return 1
    for m in resumo["mensagens"]:
        log.info(m)
    log.info("Plano de ações. Lidas: %s. Sem mudança: %s. Com erro: %s.", resumo["lidos"], resumo["iguais"], resumo["erros"])
    return 1 if resumo["erros"] else 0


if __name__ == "__main__":
    sys.exit(main())
