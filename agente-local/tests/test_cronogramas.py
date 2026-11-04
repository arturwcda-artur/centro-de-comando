"""Leitura de cronogramas com o Project simulado. Nenhum .mpp real é aberto."""
from datetime import datetime
from types import SimpleNamespace

import pytest

from cc_agente import cronogramas as c


def tarefa(uid, **extra):
    base = dict(
        UniqueID=uid, WBS=str(uid), Name=f"Tarefa {uid}", OutlineLevel=2, Summary=False, Milestone=False, Critical=True,
        Duration=960, Start=datetime(2026, 11, 2, 8), Finish=datetime(2026, 11, 3, 17), ActualStart="ND", ActualFinish="ND",
        PercentComplete=25, Cost=1500.5, TaskDependencies=[],
    )
    return SimpleNamespace(**{**base, **extra})


class AppFalso:
    def __init__(self, tarefas):
        self.ActiveProject = SimpleNamespace(Name="Plano.mpp", Tasks=tarefas, HoursPerDay=8)
        self.abertos = []
        self.fechados = []

    def FileOpenEx(self, caminho, somente_leitura):
        self.abertos.append((caminho, somente_leitura))
        return True

    def FileCloseEx(self, salvar):
        self.fechados.append(salvar)


class BancoFalso:
    def __init__(self):
        self.importados = []
        self.erros = []

    def importar(self, payload):
        self.importados.append(payload)
        return "criada"

    def registrar_erro(self, arquivo_id, mensagem):
        self.erros.append((arquivo_id, mensagem))


def registro(caminho, hash_atual=None, id_="a1"):
    return {"id": id_, "caminho": str(caminho), "ultimo_hash": hash_atual}


def rodar(arquivos, banco, ler=None, aberto=False):
    abriu = []

    def abrir():
        abriu.append(True)
        return "app"

    resumo = c.processar(arquivos, banco, abrir_project=abrir, fechar_project=lambda app: None, project_aberto=lambda: aberto, ler=ler or (lambda app, caminho: {"nome": "P", "atividades": [], "dependencias": []}))
    return resumo, abriu


def test_data_iso_trata_nd_e_na():
    assert c.data_iso("ND") is None
    assert c.data_iso("NA") is None
    assert c.data_iso("") is None
    assert c.data_iso(None) is None
    assert c.data_iso(datetime(2026, 11, 2, 8)) == "2026-11-02"


def test_ler_projeto_abre_somente_leitura_e_nao_salva():
    app = AppFalso([tarefa(1)])
    dados = c.ler_projeto(app, "C:/a.mpp")
    assert app.abertos == [("C:/a.mpp", True)]
    assert app.fechados == [c.NAO_SALVAR]
    assert dados["atividades"][0] == {
        "uid": 1, "edt": "1", "nome": "Tarefa 1", "nivel": 2, "resumo": False, "marco": False, "critica": True, "duracao_dias": 2.0,
        "inicio_previsto": "2026-11-02", "fim_previsto": "2026-11-03", "inicio_real": None, "fim_real": None, "percentual": 25, "custo": 1500.5,
    }


def test_ler_projeto_fecha_sem_salvar_mesmo_com_erro():
    class Quebrada:
        def __getattr__(self, nome):
            raise RuntimeError("falha")

    app = AppFalso([Quebrada()])
    with pytest.raises(RuntimeError):
        c.ler_projeto(app, "C:/a.mpp")
    assert app.fechados == [c.NAO_SALVAR]


def test_ler_projeto_ignora_linhas_em_branco():
    assert len(c.ler_projeto(AppFalso([None, tarefa(2)]), "C:/a.mpp")["atividades"]) == 1


@pytest.mark.parametrize("tipo_com,tipo", [(0, "TT"), (1, "TI"), (2, "IT"), (3, "II")])
def test_tipos_de_dependencia(tipo_com, tipo):
    dep = SimpleNamespace(From=SimpleNamespace(UniqueID=1), To=SimpleNamespace(UniqueID=2), Type=tipo_com, Lag=960)
    dados = c.ler_projeto(AppFalso([tarefa(1), tarefa(2, TaskDependencies=[dep])]), "C:/a.mpp")
    assert dados["dependencias"] == [{"uid": 2, "predecessora_uid": 1, "tipo": tipo, "defasagem_dias": 2.0}]


def test_dependencia_aparece_uma_vez_e_so_na_sucessora():
    dep = SimpleNamespace(From=SimpleNamespace(UniqueID=1), To=SimpleNamespace(UniqueID=2), Type=1, Lag=0)
    dados = c.ler_projeto(AppFalso([tarefa(1, TaskDependencies=[dep]), tarefa(2, TaskDependencies=[dep])]), "C:/a.mpp")
    assert len(dados["dependencias"]) == 1


def test_arquivo_sem_mudanca_nao_abre_o_project(tmp_path):
    f = tmp_path / "a.mpp"
    f.write_bytes(b"conteudo")
    banco = BancoFalso()
    resumo, abriu = rodar([registro(f, c.sha256_arquivo(f))], banco)
    assert abriu == [] and banco.importados == []
    assert resumo["iguais"] == 1


def test_arquivo_alterado_envia_com_hash(tmp_path):
    f = tmp_path / "a.mpp"
    f.write_bytes(b"novo")
    banco = BancoFalso()
    resumo, abriu = rodar([registro(f, "antigo")], banco)
    assert len(abriu) == 1
    assert banco.importados[0]["hash"] == c.sha256_arquivo(f)
    assert banco.importados[0]["arquivo_id"] == "a1"
    assert banco.importados[0]["atualizado_em_origem"]
    assert resumo["lidos"] == 1


def test_project_aberto_pelo_usuario_nao_interfere(tmp_path):
    f = tmp_path / "a.mpp"
    f.write_bytes(b"novo")
    banco = BancoFalso()
    resumo, abriu = rodar([registro(f)], banco, aberto=True)
    assert abriu == [] and banco.importados == []
    assert resumo["adiado"] is True


def test_sem_mudancas_nao_importa_se_o_project_esta_aberto(tmp_path):
    f = tmp_path / "a.mpp"
    f.write_bytes(b"igual")
    resumo, _ = rodar([registro(f, c.sha256_arquivo(f))], BancoFalso(), aberto=True)
    assert resumo["adiado"] is False


def test_arquivo_ausente_registra_erro_e_segue(tmp_path):
    f = tmp_path / "b.mpp"
    f.write_bytes(b"ok")
    banco = BancoFalso()
    resumo, _ = rodar([registro(tmp_path / "sumiu.mpp", id_="x"), registro(f, id_="y")], banco)
    assert banco.erros == [("x", "Arquivo não encontrado")]
    assert [p["arquivo_id"] for p in banco.importados] == ["y"]
    assert resumo["erros"] == 1


def test_falha_de_um_arquivo_nao_para_os_outros(tmp_path):
    a = tmp_path / "a.mpp"
    b = tmp_path / "b.mpp"
    a.write_bytes(b"1")
    b.write_bytes(b"2")
    banco = BancoFalso()

    def ler(app, caminho):
        if caminho.endswith("a.mpp"):
            raise RuntimeError("arquivo corrompido")
        return {"nome": "P", "atividades": [], "dependencias": []}

    resumo, _ = rodar([registro(a, id_="x"), registro(b, id_="y")], banco, ler=ler)
    assert banco.erros[0][0] == "x" and "corrompido" in banco.erros[0][1]
    assert [p["arquivo_id"] for p in banco.importados] == ["y"]
    assert resumo == {"lidos": 1, "iguais": 0, "erros": 1, "adiado": False}


def test_config_exige_endereco_do_banco():
    with pytest.raises(ValueError, match="CRONOGRAMA_DB_URL"):
        c.validar_config({})
