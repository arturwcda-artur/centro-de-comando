"""Índice dos documentos das obras (ADR 0018, RN-70 a RN-72).

Percorre a pasta da obra sem alterar nada e envia nome, categoria e texto para a busca. Só relê o
arquivo cujo tamanho ou data mudou. Pasta inacessível nunca arquiva o índice.

Configuração em agente.env: a mesma de cronogramas.py.
Execução: py -m cc_agente.documentos
"""
from __future__ import annotations

import json
import logging
import mimetypes
import os
import re
import sys
import unicodedata
import warnings
import xml.etree.ElementTree as ET
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from cc_agente.backup import caminho_config, ler_config
from cc_agente.cronogramas import conectar, validar_config

LIMITE_TEXTO = 50_000
LOTE = 50
MINIMO_PDF = 40  # abaixo disso, a primeira página é imagem: PDF digitalizado

CATEGORIAS = {
    "01": "planejamento", "02": "orcamento_licitacao", "03": "contratos", "04": "aditivos_reequilibrios", "05": "medicoes",
    "06": "financeiro", "07": "compras_materiais", "08": "projetos_tecnicos", "09": "programacoes", "10": "atas_reunioes",
    "11": "oficios_requerimentos", "12": "juridicos", "13": "equipe_efetivo", "14": "diario_obra", "15": "terceirizados", "99": "revisar",
}
EXTENSOES_FORA = {".py", ".pyc", ".bat", ".cmd", ".tmp", ".lnk", ".ini", ".log", ".bak", ".db"}
PASTAS_FORA = {"motor", "__pycache__", ".git", "node_modules", ".venv"}
NOME_SENSIVEL = re.compile(r"senha|password|credencia|token")
TEXTO_SENSIVEL = re.compile(r"(senha|password|pass|pin)\s*[:=]", re.IGNORECASE)

log = logging.getLogger("cc_agente.documentos")


def _sem_acento(texto: str) -> str:
    return unicodedata.normalize("NFD", texto).encode("ascii", "ignore").decode().lower()


def categoria_de(relativo: str) -> str:
    """A categoria vem do prefixo da pasta de primeiro nível (RN-71)."""
    partes = relativo.split("/")
    if len(partes) < 2:
        return "outro"
    achado = re.match(r"(\d{2})[_ -]", partes[0])
    return CATEGORIAS.get(achado.group(1), "outro") if achado else "outro"


def ignorar(relativo: str) -> bool:
    partes = relativo.split("/")
    nome = partes[-1]
    if nome.startswith("~$") or nome.startswith(".") or Path(nome).suffix.lower() in EXTENSOES_FORA:
        return True
    if any(p.lower() in PASTAS_FORA for p in partes[:-1]):
        return True
    return any(NOME_SENSIVEL.search(_sem_acento(p)) for p in partes)


def eh_obsoleto(relativo: str) -> bool:
    return any("obsolet" in _sem_acento(p) for p in relativo.split("/")[:-1])


def assinatura_de(info: os.stat_result) -> str:
    return f"{info.st_size}:{int(info.st_mtime)}"


def _texto_pdf(caminho: Path) -> str:
    from pypdf import PdfReader

    logging.getLogger("pypdf").setLevel(logging.CRITICAL)
    partes: list[str] = []
    tamanho = 0
    for pagina in PdfReader(str(caminho)).pages:
        texto = pagina.extract_text() or ""
        partes.append(texto)
        tamanho += len(texto)
        if tamanho >= LIMITE_TEXTO:
            break
    return "\n".join(partes)


def _texto_docx(caminho: Path) -> str:
    with zipfile.ZipFile(caminho) as z:
        raiz = ET.fromstring(z.read("word/document.xml"))
    return " ".join(n.text for n in raiz.iter() if n.tag.endswith("}t") and n.text)


def _texto_xlsx(caminho: Path) -> str:
    import openpyxl

    warnings.filterwarnings("ignore", category=UserWarning, module="openpyxl")
    wb = openpyxl.load_workbook(caminho, read_only=True, data_only=True)
    partes: list[str] = []
    tamanho = 0
    try:
        for aba in wb.worksheets:
            for linha in aba.iter_rows(values_only=True):
                valores = [str(v) for v in linha if isinstance(v, str) and v.strip()]
                if valores:
                    texto = " ".join(valores)
                    partes.append(texto)
                    tamanho += len(texto)
                if tamanho >= LIMITE_TEXTO:
                    return "\n".join(partes)
    finally:
        wb.close()
    return "\n".join(partes)


LEITORES = {".pdf": _texto_pdf, ".docx": _texto_docx, ".xlsx": _texto_xlsx, ".xlsm": _texto_xlsx}


def extrair_texto(caminho: Path) -> tuple[str | None, bool]:
    """Devolve o texto e se é PDF digitalizado. Arquivo que não abre entra só pelo nome."""
    extensao = caminho.suffix.lower()
    leitor = LEITORES.get(extensao)
    if leitor is None:
        return None, False
    try:
        texto = leitor(caminho).replace("\x00", "").strip()
    except Exception as e:  # noqa: BLE001 - PDF ou planilha corrompidos não param o índice
        log.warning("Sem texto em %s: %s", caminho.name, type(e).__name__)
        return None, False
    if TEXTO_SENSIVEL.search(texto):
        log.warning("Texto de %s não copiado: padrão de credencial", caminho.name)
        return None, False
    if extensao == ".pdf" and len(texto) < MINIMO_PDF:
        return None, True
    return texto[:LIMITE_TEXTO] or None, False


def montar_documento(raiz: Path, relativo: str, info: os.stat_result, ler=extrair_texto) -> dict:
    caminho = raiz / relativo
    texto, sem_texto = ler(caminho)
    modificado = datetime.fromtimestamp(info.st_mtime, timezone.utc)
    return {
        "relativo": relativo,
        "titulo": caminho.name,
        "categoria": categoria_de(relativo),
        "pasta": "/".join(relativo.split("/")[:-1]) or None,
        "data_documento": modificado.strftime("%Y-%m-%d"),
        "mime_type": mimetypes.guess_type(caminho.name)[0],
        "tamanho_bytes": info.st_size,
        "texto_extraido": texto,
        "obsoleto": eh_obsoleto(relativo),
        "sem_texto": sem_texto,
        "modificado_em": modificado.isoformat(),
        "assinatura": assinatura_de(info),
    }


def percorrer(raiz: Path):
    for pasta, subpastas, arquivos in os.walk(raiz):
        subpastas[:] = [s for s in subpastas if s.lower() not in PASTAS_FORA]
        for nome in arquivos:
            caminho = Path(pasta) / nome
            relativo = caminho.relative_to(raiz).as_posix()
            if not ignorar(relativo):
                yield relativo, caminho


def processar_pasta(pasta: dict, banco, ler=extrair_texto) -> dict:
    """Lê uma pasta inteira. Só arquiva o que sumiu depois de confirmar que a pasta foi lida."""
    resumo = {"lidos": 0, "iguais": 0, "arquivados": 0, "erros": 0}
    raiz = Path(pasta["caminho"])
    if not raiz.is_dir():
        banco.registrar_erro(pasta["id"], "Pasta não encontrada")
        resumo["erros"] += 1
        return resumo

    conhecidos = banco.conhecidos(pasta["id"])
    presentes: list[str] = []
    lote: list[dict] = []
    for relativo, caminho in percorrer(raiz):
        try:
            info = caminho.stat()
        except OSError:
            resumo["erros"] += 1
            presentes.append(relativo)
            continue
        presentes.append(relativo)
        if conhecidos.get(relativo) == assinatura_de(info):
            resumo["iguais"] += 1
            continue
        lote.append(montar_documento(raiz, relativo, info, ler))
        resumo["lidos"] += 1
        if len(lote) >= LOTE:
            banco.importar(pasta["id"], lote)
            lote = []
    if lote:
        banco.importar(pasta["id"], lote)

    if not presentes:
        banco.registrar_erro(pasta["id"], "Nenhum arquivo encontrado na pasta")
        resumo["erros"] += 1
        return resumo
    resumo["arquivados"] = banco.encerrar(pasta["id"], presentes)
    return resumo


class Banco:
    def __init__(self, conexao):
        self.conexao = conexao

    def pastas(self) -> list[dict]:
        with self.conexao.cursor() as cur:
            cur.execute("select id::text, caminho from public.listar_pastas_agente()")
            return [{"id": i, "caminho": c} for i, c in cur.fetchall()]

    def conhecidos(self, pasta_id: str) -> dict[str, str]:
        with self.conexao.cursor() as cur:
            cur.execute("select relativo, assinatura from public.listar_documentos_agente(%s)", (pasta_id,))
            return dict(cur.fetchall())

    def importar(self, pasta_id: str, documentos: list[dict]) -> None:
        with self.conexao.cursor() as cur:
            cur.execute("select public.importar_documentos(%s::jsonb)", (json.dumps({"pasta_id": pasta_id, "documentos": documentos}),))

    def encerrar(self, pasta_id: str, presentes: list[str]) -> int:
        with self.conexao.cursor() as cur:
            cur.execute("select public.encerrar_leitura_documentos(%s, %s)", (pasta_id, presentes))
            return cur.fetchone()[0]

    def registrar_erro(self, pasta_id: str, mensagem: str) -> None:
        with self.conexao.cursor() as cur:
            cur.execute("select public.registrar_erro_pasta(%s, %s)", (pasta_id, mensagem))


def main() -> int:
    arquivo_config = caminho_config()
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[logging.StreamHandler(), logging.FileHandler(arquivo_config.parent / "documentos.log", encoding="utf-8")],
    )
    try:
        config = ler_config(arquivo_config)
        validar_config(config)
        erros = 0
        with conectar(config) as conexao:
            banco = Banco(conexao)
            for pasta in banco.pastas():
                r = processar_pasta(pasta, banco)
                erros += r["erros"]
                log.info("Documentos. Lidos: %s. Sem mudança: %s. Arquivados: %s. Com erro: %s.", r["lidos"], r["iguais"], r["arquivados"], r["erros"])
    except Exception as e:  # noqa: BLE001 - a mensagem final precisa aparecer para o usuário
        log.error("Falha: %s", e)
        return 1
    return 1 if erros else 0


if __name__ == "__main__":
    sys.exit(main())
