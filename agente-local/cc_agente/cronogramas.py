"""Leitura dos cronogramas do MS Project (ADR 0015, RN-65).

Abre cada .mpp em modo somente leitura, fecha sem salvar e envia os dados ao banco por funções
restritas. Só relê o arquivo que mudou. Se o Project estiver aberto, não interfere: avisa e termina.

Configuração em agente.env: CRONOGRAMA_DB_URL e CRONOGRAMA_DB_PASSWORD.
Execução: py -m cc_agente.cronogramas
"""
from __future__ import annotations

import hashlib
import json
import logging
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from cc_agente.backup import caminho_config, interpretar_url, ler_config

NAO_SALVAR = 0  # pjDoNotSave
TIPOS_DEPENDENCIA = {0: "TT", 1: "TI", 2: "IT", 3: "II"}  # PjTaskLinkType
MINUTOS_POR_DIA_PADRAO = 480

log = logging.getLogger("cc_agente.cronogramas")


def sha256_arquivo(caminho: Path | str) -> str:
    h = hashlib.sha256()
    with open(caminho, "rb") as f:
        for bloco in iter(lambda: f.read(1024 * 1024), b""):
            h.update(bloco)
    return h.hexdigest()


def data_iso(valor) -> str | None:
    """Datas do Project. Sem data, ele devolve o texto ND (pt-BR) ou NA (inglês)."""
    if valor is None or isinstance(valor, str):
        return None
    return valor.strftime("%Y-%m-%d")


def _dias(minutos, por_dia: float) -> float | None:
    return None if minutos in (None, "") else round(float(minutos) / por_dia, 2)


def _ler_atividades(projeto) -> tuple[list[dict], list[dict]]:
    por_dia = float(getattr(projeto, "HoursPerDay", 8) or 8) * 60 or MINUTOS_POR_DIA_PADRAO
    atividades: list[dict] = []
    dependencias: list[dict] = []
    for t in projeto.Tasks:
        if t is None:  # linha em branco no Project
            continue
        uid = int(t.UniqueID)
        atividades.append({
            "uid": uid,
            "edt": t.WBS,
            "nome": t.Name,
            "nivel": int(t.OutlineLevel),
            "resumo": bool(t.Summary),
            "marco": bool(t.Milestone),
            "critica": bool(t.Critical),
            "duracao_dias": _dias(t.Duration, por_dia),
            "inicio_previsto": data_iso(t.Start),
            "fim_previsto": data_iso(t.Finish),
            "inicio_real": data_iso(t.ActualStart),
            "fim_real": data_iso(t.ActualFinish),
            "percentual": t.PercentComplete,
            "custo": float(t.Cost),
        })
        for d in t.TaskDependencies:
            if int(d.To.UniqueID) != uid:  # a mesma ligação aparece também na predecessora
                continue
            dependencias.append({
                "uid": uid,
                "predecessora_uid": int(d.From.UniqueID),
                "tipo": TIPOS_DEPENDENCIA[int(d.Type)],
                "defasagem_dias": _dias(d.Lag, por_dia),
            })
    return atividades, dependencias


def ler_projeto(app, caminho: str) -> dict:
    """Abre em modo somente leitura e sempre fecha sem salvar, mesmo se a leitura falhar."""
    if not app.FileOpenEx(caminho, True):
        raise RuntimeError("O Project não abriu o arquivo")
    try:
        projeto = app.ActiveProject
        atividades, dependencias = _ler_atividades(projeto)
        return {"nome": projeto.Name, "atividades": atividades, "dependencias": dependencias}
    finally:
        app.FileCloseEx(NAO_SALVAR)


def processar(arquivos, banco, *, abrir_project, fechar_project, project_aberto, ler=ler_projeto) -> dict:
    """Lê os arquivos que mudaram. A falha de um arquivo não interrompe os outros."""
    resumo = {"lidos": 0, "iguais": 0, "erros": 0, "adiado": False}
    pendentes = []
    for a in arquivos:
        caminho = Path(a["caminho"])
        if not caminho.is_file():
            banco.registrar_erro(a["id"], "Arquivo não encontrado")
            resumo["erros"] += 1
            continue
        hash_atual = sha256_arquivo(caminho)
        if hash_atual == a["ultimo_hash"]:
            resumo["iguais"] += 1
        else:
            pendentes.append((a, caminho, hash_atual))

    if not pendentes:
        return resumo
    if project_aberto():
        log.warning("O Project está aberto. Feche-o e rode de novo: nenhum cronograma foi lido.")
        resumo["adiado"] = True
        return resumo

    app = abrir_project()
    try:
        for a, caminho, hash_atual in pendentes:
            try:
                dados = ler(app, str(caminho))
                modificado = datetime.fromtimestamp(caminho.stat().st_mtime, timezone.utc).isoformat()
                banco.importar({**dados, "arquivo_id": a["id"], "hash": hash_atual, "atualizado_em_origem": modificado})
                resumo["lidos"] += 1
            except Exception as e:  # noqa: BLE001 - segue para o próximo arquivo
                log.exception("Falha ao ler %s", caminho.name)
                banco.registrar_erro(a["id"], str(e))
                resumo["erros"] += 1
    finally:
        fechar_project(app)
    return resumo


def project_aberto_no_windows() -> bool:
    saida = subprocess.run(["tasklist", "/FI", "IMAGENAME eq WINPROJ.EXE", "/NH"], capture_output=True, text=True, check=False)
    return "WINPROJ.EXE" in saida.stdout.upper()


def abrir_project_oculto():
    import win32com.client  # só existe no Windows; os testes não passam por aqui

    app = win32com.client.DispatchEx("MSProject.Application")
    app.Visible = False
    app.DisplayAlerts = False
    return app


def fechar_project_oculto(app) -> None:
    app.Quit(NAO_SALVAR)


class Banco:
    def __init__(self, conexao):
        self.conexao = conexao

    def listar(self) -> list[dict]:
        with self.conexao.cursor() as cur:
            cur.execute("select id::text, caminho, ultimo_hash from public.listar_cronogramas_agente()")
            return [{"id": i, "caminho": c, "ultimo_hash": h} for i, c, h in cur.fetchall()]

    def importar(self, payload: dict) -> str:
        with self.conexao.cursor() as cur:
            cur.execute("select public.importar_cronograma(%s::jsonb)", (json.dumps(payload),))
            return cur.fetchone()[0]

    def registrar_erro(self, arquivo_id: str, mensagem: str) -> None:
        with self.conexao.cursor() as cur:
            cur.execute("select public.registrar_erro_cronograma(%s, %s)", (arquivo_id, mensagem))


def validar_config(config: dict[str, str]) -> None:
    if not config.get("CRONOGRAMA_DB_URL"):
        raise ValueError("Falta CRONOGRAMA_DB_URL em agente.env")


def conectar(config: dict[str, str]):
    import psycopg

    con = interpretar_url(config["CRONOGRAMA_DB_URL"], config.get("CRONOGRAMA_DB_PASSWORD"))
    return psycopg.connect(host=con.host, port=con.porta, user=con.usuario, password=con.senha, dbname=con.banco, sslmode="require", autocommit=True)


def main() -> int:
    arquivo_config = caminho_config()
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[logging.StreamHandler(), logging.FileHandler(arquivo_config.parent / "cronogramas.log", encoding="utf-8")],
    )
    try:
        config = ler_config(arquivo_config)
        validar_config(config)
        with conectar(config) as conexao:
            banco = Banco(conexao)
            resumo = processar(banco.listar(), banco, abrir_project=abrir_project_oculto, fechar_project=fechar_project_oculto, project_aberto=project_aberto_no_windows)
    except Exception as e:  # noqa: BLE001 - a mensagem final precisa aparecer para o usuário
        log.error("Falha: %s", e)
        return 1
    log.info("Lidos: %s. Sem mudança: %s. Com erro: %s.", resumo["lidos"], resumo["iguais"], resumo["erros"])
    return 2 if resumo["adiado"] else (1 if resumo["erros"] else 0)


if __name__ == "__main__":
    sys.exit(main())
