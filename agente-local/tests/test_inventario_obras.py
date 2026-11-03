from pathlib import Path

from cc_agente import inventario_obras as inv


def _arquivo(caminho: Path, conteudo: bytes = b"x"):
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_bytes(conteudo)


def _montar(base: Path):
    obra = base / "2.1-EM ANDAMENTO" / "PRF-RECANTO"
    for i in range(1, 16):
        (obra / f"{i:02d}_Pasta").mkdir(parents=True)
    _arquivo(obra / "01_Pasta" / "cronograma.mpp")
    _arquivo(obra / "05_Pasta" / "medicao.xlsx")
    _arquivo(obra / "03_Pasta" / "contrato.pdf")
    _arquivo(obra / "03_Pasta" / "~$contrato.docx")  # temporário do Office: ignorado
    _arquivo(obra / "Thumbs.db")  # ignorado
    _arquivo(base / "2.1-EM ANDAMENTO" / "PEDIDOS GERAIS" / "Index.html")
    _arquivo(base / "2.1-EM ANDAMENTO" / "LEVORSSE" / "NILLS" / "a.pdf")
    _arquivo(base / "2.1-EM ANDAMENTO" / "LEVORSSE" / "container" / "b.pdf")
    _arquivo(base / "2.1-EM ANDAMENTO" / "LEVORSSE" / "solto.pdf")
    _arquivo(base / "2.2-AGUARDANDO" / "Piso_Elevado_Prodasen" / "p.pdf")
    _arquivo(base / "2.3-FINALIZADAS" / "tcdf" / "t.pdf")
    _arquivo(base / "2.1-EM ANDAMENTO" / "arquivo-na-raiz.docx")  # arquivo solto: não é proposta
    _arquivo(base / "teste" / "x.rar")  # pasta fora dos grupos: ignorada


def test_inventario_gera_propostas_com_situacao_e_evidencias(tmp_path):
    _montar(tmp_path)
    por_codigo = {p.codigo_sugerido: p for p in inv.inventariar(tmp_path)}

    assert set(por_codigo) == {"PRF-RECANTO", "PEDIDOS-GERAIS", "LEVORSSE-NILLS", "LEVORSSE-CONTAINER", "PISO-ELEVADO-PRODASEN", "TCDF"}
    prf = por_codigo["PRF-RECANTO"]
    assert (prf.situacao_sugerida, prf.qtd_arquivos, prf.qtd_cronogramas, prf.qtd_planilhas, prf.qtd_pdfs) == ("andamento", 3, 1, 1, 1)
    assert prf.estrutura_padrao is True
    assert prf.pista_contratante == "Polícia Rodoviária Federal (PRF)"
    assert prf.id_externo == "2.1-EM ANDAMENTO/PRF-RECANTO"
    assert por_codigo["PISO-ELEVADO-PRODASEN"].situacao_sugerida == "aguardando"
    assert por_codigo["PISO-ELEVADO-PRODASEN"].pista_contratante == "Senado Federal (Prodasen)"
    assert por_codigo["TCDF"].situacao_sugerida == "concluida"


def test_pasta_agrupadora_vira_uma_proposta_por_frente(tmp_path):
    _montar(tmp_path)
    nills = next(p for p in inv.inventariar(tmp_path) if p.codigo_sugerido == "LEVORSSE-NILLS")
    assert nills.nome_sugerido == "LEVORSSE — NILLS"
    assert "Frente da pasta LEVORSSE" in nills.observacao


def test_provavel_nao_obra_fica_marcada_mas_nao_e_descartada(tmp_path):
    _montar(tmp_path)
    pedidos = next(p for p in inv.inventariar(tmp_path) if p.codigo_sugerido == "PEDIDOS-GERAIS")
    assert pedidos.provavel_nao_obra is True


def test_pastas_com_mesmo_nome_recebem_codigos_distintos(tmp_path):
    _arquivo(tmp_path / "2.2-AGUARDANDO" / "MIRANTE" / "a.pdf")
    _arquivo(tmp_path / "2.3-FINALIZADAS" / "mirante" / "b.pdf")
    codigos = [p.codigo_sugerido for p in inv.inventariar(tmp_path)]
    assert codigos == ["MIRANTE", "MIRANTE-CONCLUIDA"]


def test_codigo_sem_acentos_e_espacos():
    assert inv.codigo_de("Reforma do Colégio Cruzeiro - 90016_2025") == "REFORMA-DO-COLEGIO-CRUZEIRO-90"
    assert inv.nome_de("Senado_Federal_bloco_14") == "Senado Federal bloco 14"


def test_sql_escapa_aspas_e_preserva_revisao(tmp_path):
    _arquivo(tmp_path / "2.2-AGUARDANDO" / "OBRA D'ÁGUA" / "a.pdf")
    sql = inv.para_sql(inv.inventariar(tmp_path))
    assert "'OBRA D''ÁGUA'" in sql
    assert "on conflict (fonte, id_externo) do update set" in sql
    atualizacao = sql.split("do update set", 1)[1]
    assert "status" not in atualizacao and "nome_sugerido" not in atualizacao  # revisão do proprietário intocada


def test_somente_leitura(tmp_path):
    _montar(tmp_path)
    antes = sorted((p.as_posix(), p.stat().st_mtime) for p in tmp_path.rglob("*"))
    inv.inventariar(tmp_path)
    assert sorted((p.as_posix(), p.stat().st_mtime) for p in tmp_path.rglob("*")) == antes
