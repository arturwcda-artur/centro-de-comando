from pathlib import Path

import pytest

from cc_agente.restauracao import backup_mais_recente, comparar


def test_igual_nao_tem_diferenca():
    assert comparar({"public.obras": 8}, {"public.obras": 8}) == {"ausentes": [], "diferentes": [], "cresceram": []}


def test_tabela_ausente_e_diferenca_sao_problema():
    r = comparar({"public.obras": 8, "public.tarefas": 2}, {"public.obras": 7})
    assert r["ausentes"] == ["public.tarefas"]
    assert r["diferentes"] == [("public.obras", 8, 7)]


def test_auditoria_pode_crescer_depois_do_backup():
    r = comparar({"app.auditoria": 10}, {"app.auditoria": 8})
    assert r["cresceram"] == [("app.auditoria", 10, 8)]
    assert r["diferentes"] == []


def test_auditoria_menor_na_nuvem_e_problema():
    assert comparar({"app.auditoria": 8}, {"app.auditoria": 10})["diferentes"]


def test_escolhe_o_backup_mais_recente(tmp_path: Path):
    (tmp_path / "cc_backup_2026-11-03_1148.dump").touch()
    (tmp_path / "cc_backup_2026-11-05_1404.dump").touch()
    assert backup_mais_recente(tmp_path).name == "cc_backup_2026-11-05_1404.dump"


def test_sem_backup_avisa(tmp_path: Path):
    with pytest.raises(FileNotFoundError):
        backup_mais_recente(tmp_path)
