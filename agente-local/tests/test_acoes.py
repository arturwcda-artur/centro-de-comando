"""Leitura do plano de ações com planilhas de teste criadas aqui. Nenhum dado real."""
from datetime import datetime

import openpyxl
import pytest

from cc_agente import acoes as a

CABECALHO = ["Nº", "Aberta em", "Tipo", "O que fazer", "Serviço (EAP)", "Responsável", "Prazo", "Status", "Concluída em", "ALERTA",
             "Histórico / observação", "Frente", "Por quê (problema que resolve)", "Onde", "Como (passos)", "Quanto (R$)",
             "Depende das ações Nº", "Libera (ações / gate)", "G", "U", "T", "GUT", "Etapa PDCA", "Evidência de conclusão (o que comprova)", "Prazo original"]


def planilha(caminho, linhas, cabecalho=CABECALHO, aba="AÇÕES"):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = aba
    ws.cell(1, 1, "AÇÕES — TUDO QUE ALGUÉM PRECISA FAZER")
    for col, texto in enumerate(cabecalho, start=1):
        ws.cell(5, col, texto)
    for r, dados in enumerate(linhas, start=6):
        for col, valor in dados.items():
            if col in cabecalho:
                ws.cell(r, cabecalho.index(col) + 1, valor)
        ws.cell(r, 1, "=ROW()-5")  # fórmula sem resultado salvo, como numa planilha gerada fora do Excel
    wb.save(caminho)
    return caminho


ACAO = {"Tipo": "Restrição", "O que fazer": "Cobrar o relatório da sondagem", "Responsável": "Eng. Fulano (obra)", "Prazo": datetime(2026, 11, 13),
        "Status": "Aberta", "Frente": "F2 Projetos", "Por quê (problema que resolve)": "Sem sondagem não se escolhe a fundação",
        "Depende das ações Nº": "2, 3", "G": 5, "U": 5, "T": 3, "Etapa PDCA": "P — Planejar", "Prazo original": datetime(2026, 11, 10)}


def test_le_acao_com_5w2h_gut_e_dependencias(tmp_path):
    p = planilha(tmp_path / "p.xlsx", [ACAO, {**ACAO, "O que fazer": "Segunda", "Depende das ações Nº": "1; 2 e 2"}])
    lidas = a.ler_plano_de_acoes(p)["acoes"]
    x = lidas[0]
    assert x["numero"] == 1 and x["titulo"] == "[1] Cobrar o relatório da sondagem"
    assert x["tipo"] == "pendencia" and x["status"] == "a_fazer" and x["prazo"] == "2026-11-13"
    assert x["responsavel_chave"] == "fulano"
    assert x["importancia"] == 5 and x["impacto"] == 3 and x["critica"] is True  # GUT 75
    assert x["depende"] == ["2", "3"]
    assert "Por quê: Sem sondagem" in x["descricao"] and "GUT: 75 (G5 × U5 × T3)" in x["descricao"] and "Prazo original: 10/11/2026" in x["descricao"]
    assert lidas[1]["depende"] == ["1"]  # a própria ação (2) não conta e repetição vale uma vez
    assert lidas[1]["numero"] == 2


def test_numero_segue_a_linha_e_pula_linhas_vazias(tmp_path):
    p = planilha(tmp_path / "p.xlsx", [ACAO, {"Status": "Aberta"}, {**ACAO, "O que fazer": "Terceira"}])
    lidas = a.ler_plano_de_acoes(p)["acoes"]
    assert [x["numero"] for x in lidas] == [1, 3]


def test_status_e_conclusao(tmp_path):
    p = planilha(tmp_path / "p.xlsx", [{**ACAO, "Status": "Concluída", "Concluída em": datetime(2026, 11, 12)}, {**ACAO, "Status": "Em andamento"}])
    lidas = a.ler_plano_de_acoes(p)["acoes"]
    assert lidas[0]["status"] == "concluida" and lidas[0]["concluida_em"] == "2026-11-12"
    assert lidas[1]["status"] == "em_andamento" and lidas[1]["concluida_em"] is None


def test_status_desconhecido_para_a_leitura(tmp_path):
    p = planilha(tmp_path / "p.xlsx", [{**ACAO, "Status": "Talvez"}])
    with pytest.raises(ValueError, match="status 'Talvez' desconhecido"):
        a.ler_plano_de_acoes(p)


def test_sem_gut_completo_nao_e_critica(tmp_path):
    p = planilha(tmp_path / "p.xlsx", [{**ACAO, "T": None}])
    x = a.ler_plano_de_acoes(p)["acoes"][0]
    assert x["critica"] is False and x["impacto"] == 3 and "GUT" not in x["descricao"]


def test_colunas_obrigatorias(tmp_path):
    p = planilha(tmp_path / "p.xlsx", [ACAO], cabecalho=[c for c in CABECALHO if c != "Prazo"])
    with pytest.raises(ValueError, match="faltam as colunas prazo"):
        a.ler_plano_de_acoes(p)


def test_aba_ausente(tmp_path):
    p = planilha(tmp_path / "p.xlsx", [ACAO], aba="Outra")
    with pytest.raises(ValueError, match="aba AÇÕES não encontrada"):
        a.ler_plano_de_acoes(p)


def test_chave_pessoa():
    assert a.chave_pessoa("Eng. Adamo (obra)") == "adamo"
    assert a.chave_pessoa("Arq. Fernanda (SC-01)") == "fernanda"
    assert a.chave_pessoa("Artur") == "artur"
    assert a.chave_pessoa("Émanuel Victor") == "emanuel"
    assert a.chave_pessoa("") == ""


def test_hash_muda_so_quando_a_acao_muda(tmp_path):
    h1 = a.ler_plano_de_acoes(planilha(tmp_path / "1.xlsx", [ACAO]))["acoes"][0]["hash"]
    h2 = a.ler_plano_de_acoes(planilha(tmp_path / "2.xlsx", [ACAO]))["acoes"][0]["hash"]
    h3 = a.ler_plano_de_acoes(planilha(tmp_path / "3.xlsx", [{**ACAO, "Prazo": datetime(2026, 11, 20)}]))["acoes"][0]["hash"]
    assert h1 == h2 != h3


class BancoFalso:
    def __init__(self):
        self.importados, self.erros = [], []

    def importar(self, payload):
        self.importados.append(payload)
        return "1 novas, 0 alteradas, 0 fora da planilha"

    def registrar_erro(self, arquivo_id, mensagem):
        self.erros.append((arquivo_id, mensagem))


def test_processar_pula_igual_e_segue_apos_erro(tmp_path):
    boa = planilha(tmp_path / "boa.xlsx", [ACAO])
    ruim = planilha(tmp_path / "ruim.xlsx", [{**ACAO, "Status": "Talvez"}])
    from cc_agente.cronogramas import sha256_arquivo
    banco = BancoFalso()
    resumo = a.processar([
        {"id": "1", "caminho": str(boa), "ultimo_hash": None},
        {"id": "2", "caminho": str(ruim), "ultimo_hash": None},
        {"id": "3", "caminho": str(boa), "ultimo_hash": sha256_arquivo(boa)},
        {"id": "4", "caminho": str(tmp_path / "nao-existe.xlsx"), "ultimo_hash": None},
    ], banco)
    assert (resumo["lidos"], resumo["iguais"], resumo["erros"]) == (1, 1, 2)
    assert banco.importados[0]["arquivo_id"] == "1" and len(banco.importados[0]["acoes"]) == 1
    assert [e[0] for e in banco.erros] == ["2", "4"]
