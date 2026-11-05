"""Leitura de medições com planilhas de teste criadas aqui. Nenhum dado real."""
from datetime import datetime

import openpyxl
import pytest

from cc_agente import medicoes as m


def planilha(caminho, aba="Medições", cabecalho=True):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = aba
    ws.cell(3, 9, "Nº medição:")
    ws.cell(4, 9, "Data Medição:")
    ws.cell(5, 9, "Período de:")
    ws.cell(6, 9, "a:")
    for n in range(0, 3):
        ws.cell(3, 10 + n, n)
        ws.cell(13, 10 + n, f"MED.{n:02d}")
    ws.cell(4, 11, datetime(2026, 5, 6))
    ws.cell(5, 11, datetime(2026, 4, 6))
    ws.cell(6, 11, datetime(2026, 4, 15))
    if cabecalho:
        for col, texto in ((1, "ITEM"), (3, "DESCRIÇÃO DOS SERVIÇOS"), (4, "QTDE"), (5, "UN"), (6, "P.UNIT."), (7, "TOTAL")):
            ws.cell(13, col, texto)
    for linha, dados in enumerate([(1, "Engenheiro", 264, "H", 108.19095942, 28562.41), (2, "Mestre", 528, "H", 45.96, 24266.88), (3, "Tapume", 126.64, "m²", 82.9776, 10508.28)], start=14):
        for col, valor in zip((1, 3, 4, 5, 6, 7), dados):
            ws.cell(linha, col, valor)
    ws.cell(14, 11, 12)
    ws.cell(16, 11, 75)
    ws.cell(17, 1, 4)  # linha numerada sem serviço
    ws.cell(18, 2, "Total do contrato e aditivos")
    ws.cell(18, 7, 999)
    wb.save(caminho)
    return caminho


class BancoFalso:
    def __init__(self):
        self.importados = []
        self.erros = []

    def importar(self, payload):
        self.importados.append(payload)

    def registrar_erro(self, arquivo_id, mensagem):
        self.erros.append((arquivo_id, mensagem))


def registro(caminho, hash_atual=None, id_="a1", modelo="mascara_medicoes"):
    return {"id": id_, "caminho": str(caminho), "modelo": modelo, "ultimo_hash": hash_atual}


def test_le_itens_e_ignora_linhas_sem_servico(tmp_path):
    dados = m.ler_mascara_medicoes(planilha(tmp_path / "a.xlsx"))
    assert [i["item"] for i in dados["itens"]] == ["1", "2", "3"]
    assert dados["itens"][0] == {"item": "1", "descricao": "Engenheiro", "unidade": "H", "quantidade": 264, "preco_unitario": 108.19095942, "valor_total": 28562.41}


def test_le_so_medicoes_com_periodo(tmp_path):
    dados = m.ler_mascara_medicoes(planilha(tmp_path / "a.xlsx"))
    assert [x["numero"] for x in dados["medicoes"]] == [1]
    assert dados["medicoes"][0]["data"] == "2026-05-06"
    assert dados["medicoes"][0]["periodo_inicio"] == "2026-04-06"
    assert dados["medicoes"][0]["periodo_fim"] == "2026-04-15"


def test_valor_da_medicao_soma_os_itens_ja_arredondados_como_a_planilha(tmp_path):
    medicao = m.ler_mascara_medicoes(planilha(tmp_path / "a.xlsx"))["medicoes"][0]
    assert medicao["valor_bruto"] == round(round(12 * 108.19095942, 2) + round(75 * 82.9776, 2), 2)
    assert [i["item"] for i in medicao["itens"]] == ["1", "3"]
    assert medicao["itens"][0] == {"item": "1", "quantidade": 12, "valor": 1298.29}


def test_hash_da_medicao_muda_com_o_conteudo(tmp_path):
    a = m.ler_mascara_medicoes(planilha(tmp_path / "a.xlsx"))["medicoes"][0]["hash"]
    wb = openpyxl.load_workbook(tmp_path / "a.xlsx")
    wb.active.cell(14, 11, 13)
    wb.save(tmp_path / "b.xlsx")
    assert m.ler_mascara_medicoes(tmp_path / "b.xlsx")["medicoes"][0]["hash"] != a


def test_aba_ausente_recusa_com_erro_claro(tmp_path):
    with pytest.raises(ValueError, match="aba"):
        m.ler_mascara_medicoes(planilha(tmp_path / "a.xlsx", aba="Outra"))


def test_cabecalho_diferente_recusa(tmp_path):
    with pytest.raises(ValueError, match="cabeçalho"):
        m.ler_mascara_medicoes(planilha(tmp_path / "a.xlsx", cabecalho=False))


def test_arquivo_sem_mudanca_nao_e_lido(tmp_path):
    f = planilha(tmp_path / "a.xlsx")
    banco = BancoFalso()
    resumo = m.processar([registro(f, m.sha256_arquivo(f))], banco)
    assert banco.importados == [] and resumo["iguais"] == 1


def test_arquivo_alterado_envia_com_hash(tmp_path):
    f = planilha(tmp_path / "a.xlsx")
    banco = BancoFalso()
    resumo = m.processar([registro(f, "antigo")], banco)
    assert banco.importados[0]["hash"] == m.sha256_arquivo(f)
    assert banco.importados[0]["arquivo_id"] == "a1"
    assert resumo["lidos"] == 1


def test_arquivo_ausente_registra_erro_e_segue(tmp_path):
    f = planilha(tmp_path / "a.xlsx")
    banco = BancoFalso()
    resumo = m.processar([registro(tmp_path / "sumiu.xlsx", id_="x"), registro(f, id_="y")], banco)
    assert banco.erros == [("x", "Arquivo não encontrado")]
    assert [p["arquivo_id"] for p in banco.importados] == ["y"]
    assert resumo["erros"] == 1


def test_planilha_invalida_nao_para_as_outras(tmp_path):
    ruim = planilha(tmp_path / "ruim.xlsx", aba="Outra")
    boa = planilha(tmp_path / "boa.xlsx")
    banco = BancoFalso()
    resumo = m.processar([registro(ruim, id_="x"), registro(boa, id_="y")], banco)
    assert banco.erros[0][0] == "x" and "aba" in banco.erros[0][1]
    assert resumo == {"lidos": 1, "iguais": 0, "erros": 1}


def test_modelo_desconhecido_vira_erro(tmp_path):
    banco = BancoFalso()
    m.processar([registro(planilha(tmp_path / "a.xlsx"), modelo="outro")], banco)
    assert "Modelo" in banco.erros[0][1]


def alterar(caminho, celulas):
    wb = openpyxl.load_workbook(caminho)
    for (linha, coluna), valor in celulas.items():
        wb["Medições"].cell(linha, coluna).value = valor
    wb.save(caminho)
    return caminho


def test_data_digitada_como_texto_e_aceita(tmp_path):
    r = m.ler_mascara_medicoes(alterar(planilha(tmp_path / "a.xlsx"), {(5, 11): "06/04/2026"}))
    assert r["medicoes"][0]["periodo_inicio"] == "2026-04-06"


def test_medicao_com_valor_e_sem_periodo_recusa(tmp_path):
    with pytest.raises(ValueError, match="sem período"):
        m.ler_mascara_medicoes(alterar(planilha(tmp_path / "a.xlsx"), {(5, 11): None}))


def test_medicao_com_fim_antes_do_inicio_recusa(tmp_path):
    with pytest.raises(ValueError, match="termina antes"):
        m.ler_mascara_medicoes(alterar(planilha(tmp_path / "a.xlsx"), {(6, 11): datetime(2025, 4, 15)}))
