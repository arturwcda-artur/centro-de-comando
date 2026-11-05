"""Índice de documentos com arquivos de teste criados aqui. Nenhum dado real."""
import os
import zipfile

import openpyxl
import pytest

from cc_agente import documentos as d


class BancoFalso:
    def __init__(self, conhecidos=None):
        self._conhecidos = conhecidos or {}
        self.lotes = []
        self.encerrados = []
        self.erros = []

    def conhecidos(self, pasta_id):
        return self._conhecidos

    def importar(self, pasta_id, documentos):
        self.lotes.append(documentos)

    def encerrar(self, pasta_id, presentes):
        self.encerrados.append(sorted(presentes))
        return 0

    def registrar_erro(self, pasta_id, mensagem):
        self.erros.append(mensagem)


def criar(raiz, relativo, conteudo=b"x"):
    caminho = raiz / relativo
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_bytes(conteudo)
    return caminho


def pasta(raiz):
    return {"id": "p1", "caminho": str(raiz)}


sem_ler = lambda caminho: (None, False)  # noqa: E731


@pytest.mark.parametrize("relativo,categoria", [
    ("05_Medicoes/a.xlsx", "medicoes"),
    ("01_Planejamento_e_Cronograma/x/y.mpp", "planejamento"),
    ("99_REVISAR/a.pdf", "revisar"),
    ("16-pastas-compartilhadas/a.pdf", "outro"),
    ("solto.pdf", "outro"),
])
def test_categoria_vem_da_pasta(relativo, categoria):
    assert d.categoria_de(relativo) == categoria


@pytest.mark.parametrize("relativo", ["17/motor/gerar.txt", "a/b.py", "a/~$planilha.xlsx", "a/SENHAS.xlsx", "Credenciais/a.pdf", "a/__pycache__/x.txt", "a/.oculto"])
def test_fica_de_fora(relativo):
    assert d.ignorar(relativo)


def test_arquivo_normal_entra():
    assert not d.ignorar("05_Medicoes/1º_Medição_PRF.xlsx")


def test_obsoleto_pela_pasta():
    assert d.eh_obsoleto("01/obsoleto/a.mpp")
    assert not d.eh_obsoleto("01/valido/obsoleto.mpp")


def test_texto_do_word(tmp_path):
    f = tmp_path / "a.docx"
    with zipfile.ZipFile(f, "w") as z:
        z.writestr("word/document.xml", '<w:document xmlns:w="urn:w"><w:p><w:t>Ata de</w:t><w:t>reunião</w:t></w:p></w:document>')
    assert d.extrair_texto(f) == ("Ata de reunião", False)


def test_texto_do_excel_pega_so_textos(tmp_path):
    wb = openpyxl.Workbook()
    wb.active.append(["Estaca raiz", 120, None])
    f = tmp_path / "a.xlsx"
    wb.save(f)
    assert d.extrair_texto(f) == ("Estaca raiz", False)


def test_texto_e_limitado(tmp_path, monkeypatch):
    monkeypatch.setitem(d.LEITORES, ".pdf", lambda c: "x" * (d.LIMITE_TEXTO + 10))
    texto, _ = d.extrair_texto(criar(tmp_path, "a.pdf"))
    assert len(texto) == d.LIMITE_TEXTO


def test_pdf_sem_texto_e_marcado_como_digitalizado(tmp_path, monkeypatch):
    monkeypatch.setitem(d.LEITORES, ".pdf", lambda c: "  ")
    assert d.extrair_texto(criar(tmp_path, "a.pdf")) == (None, True)


def test_caractere_nulo_e_retirado(tmp_path, monkeypatch):
    monkeypatch.setitem(d.LEITORES, ".pdf", lambda c: "laje" + "\x00" + " do bloco técnico com texto suficiente para contar")
    assert "\x00" not in d.extrair_texto(criar(tmp_path, "a.pdf"))[0]


def test_texto_com_credencial_nao_e_copiado(tmp_path, monkeypatch):
    monkeypatch.setitem(d.LEITORES, ".pdf", lambda c: "acesso ao portal, senha: 12345, conforme combinado com a equipe")
    assert d.extrair_texto(criar(tmp_path, "a.pdf")) == (None, False)


def test_arquivo_corrompido_entra_so_pelo_nome(tmp_path):
    assert d.extrair_texto(criar(tmp_path, "a.xlsx", b"nao e planilha")) == (None, False)


def test_formato_sem_leitor_entra_sem_texto(tmp_path):
    assert d.extrair_texto(criar(tmp_path, "a.dwg")) == (None, False)


def test_le_e_envia_a_pasta(tmp_path):
    criar(tmp_path, "05_Medicoes/a.pdf")
    criar(tmp_path, "motor/ignorado.txt")
    banco = BancoFalso()
    r = d.processar_pasta(pasta(tmp_path), banco, sem_ler)
    assert r["lidos"] == 1
    documento = banco.lotes[0][0]
    assert documento["relativo"] == "05_Medicoes/a.pdf"
    assert documento["categoria"] == "medicoes"
    assert documento["pasta"] == "05_Medicoes"
    assert banco.encerrados == [["05_Medicoes/a.pdf"]]


def test_arquivo_sem_mudanca_nao_e_relido(tmp_path):
    f = criar(tmp_path, "a.pdf")
    banco = BancoFalso({"a.pdf": d.assinatura_de(f.stat())})

    def nao_ler(caminho):
        raise AssertionError("não devia ler")

    r = d.processar_pasta(pasta(tmp_path), banco, nao_ler)
    assert r == {"lidos": 0, "iguais": 1, "arquivados": 0, "erros": 0}


def test_arquivo_alterado_e_relido(tmp_path):
    f = criar(tmp_path, "a.pdf")
    os.utime(f, (1000, 1000))
    r = d.processar_pasta(pasta(tmp_path), BancoFalso({"a.pdf": "0:0"}), sem_ler)
    assert r["lidos"] == 1


def test_envia_em_lotes(tmp_path):
    for i in range(d.LOTE + 3):
        criar(tmp_path, f"a{i}.pdf")
    banco = BancoFalso()
    d.processar_pasta(pasta(tmp_path), banco, sem_ler)
    assert [len(x) for x in banco.lotes] == [d.LOTE, 3]


def test_pasta_inacessivel_nunca_arquiva(tmp_path):
    banco = BancoFalso({"a.pdf": "1:1"})
    r = d.processar_pasta(pasta(tmp_path / "sumiu"), banco, sem_ler)
    assert banco.encerrados == []
    assert banco.erros == ["Pasta não encontrada"]
    assert r["erros"] == 1


def test_pasta_vazia_nunca_arquiva(tmp_path):
    banco = BancoFalso({"a.pdf": "1:1"})
    d.processar_pasta(pasta(tmp_path), banco, sem_ler)
    assert banco.encerrados == []
    assert banco.erros


def test_arquivo_sumido_fica_fora_dos_presentes(tmp_path):
    criar(tmp_path, "b.pdf")
    banco = BancoFalso({"a.pdf": "1:1"})
    d.processar_pasta(pasta(tmp_path), banco, sem_ler)
    assert banco.encerrados == [["b.pdf"]]
