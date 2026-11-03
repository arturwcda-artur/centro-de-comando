from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

import pytest

from cc_agente import backup


URL = "postgresql://postgres.abc:S%40nha%23forte@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"


def test_interpreta_url_com_senha_codificada():
    con = backup.interpretar_url(URL)
    assert con.host == "aws-0-sa-east-1.pooler.supabase.com"
    assert con.porta == 5432
    assert con.usuario == "postgres.abc"
    assert con.senha == "S@nha#forte"
    assert con.banco == "postgres"


def test_senha_separada_dispensa_codificar_simbolos():
    con = backup.interpretar_url("postgresql://postgres.abc@h:5432/postgres", senha="a@b#c/d:e")
    assert con.senha == "a@b#c/d:e"
    assert con.usuario == "postgres.abc"


@pytest.mark.parametrize("url", ["mysql://u:s@h/db", "postgresql://u@h/db", "nada"])
def test_rejeita_url_invalida_ou_sem_senha(url):
    with pytest.raises(ValueError):
        backup.interpretar_url(url)


def test_nome_usa_fuso_de_sao_paulo():
    # 02:30 UTC de 04/11 ainda é 03/11 em São Paulo (UTC-3)
    assert backup.nome_arquivo(datetime(2026, 11, 4, 2, 30, tzinfo=timezone.utc)) == "cc_backup_2026-11-03_2330.dump"


def test_senha_nunca_vai_para_a_linha_de_comando():
    con = backup.interpretar_url(URL)
    comando = backup.montar_comando("pg_dump", con, Path("x.dump"))
    assert all("S@nha#forte" not in parte for parte in comando)
    assert "--format" in comando and "custom" in comando


def test_retencao_remove_so_os_antigos_e_so_arquivos_do_script(tmp_path):
    for dia in range(1, 6):
        (tmp_path / f"cc_backup_2026-11-0{dia}_0300.dump").write_bytes(b"x")
    (tmp_path / "outro_arquivo.dump").write_bytes(b"x")
    (tmp_path / "cc_backup_2026-11-06_0300.dump.parcial").write_bytes(b"x")

    remover = backup.backups_a_remover(tmp_path, manter=3)

    assert sorted(p.name for p in remover) == ["cc_backup_2026-11-01_0300.dump", "cc_backup_2026-11-02_0300.dump"]


def test_executar_passa_senha_por_ambiente_e_aplica_retencao(tmp_path):
    (tmp_path / "cc_backup_2026-01-01_0300.dump").write_bytes(b"antigo")
    chamadas = []

    def rodar_falso(comando, env, **_):
        chamadas.append((comando, env))
        Path(comando[comando.index("--file") + 1]).write_bytes(b"dump")
        return SimpleNamespace(returncode=0, stderr="")

    destino = backup.executar(
        {"SUPABASE_DB_URL": URL, "BACKUP_DIR": str(tmp_path), "BACKUP_MANTER": "1"},
        agora=datetime(2026, 11, 3, 13, 0, tzinfo=timezone.utc),
        rodar=rodar_falso,
    )

    assert destino.name == "cc_backup_2026-11-03_1000.dump"
    assert destino.read_bytes() == b"dump"
    assert chamadas[0][1]["PGPASSWORD"] == "S@nha#forte"
    assert sorted(p.name for p in tmp_path.iterdir()) == ["cc_backup_2026-11-03_1000.dump"]


def test_falha_do_pg_dump_nao_deixa_arquivo_nem_apaga_backups(tmp_path):
    existente = tmp_path / "cc_backup_2026-01-01_0300.dump"
    existente.write_bytes(b"antigo")

    def rodar_falho(comando, env, **_):
        Path(comando[comando.index("--file") + 1]).write_bytes(b"pela metade")
        return SimpleNamespace(returncode=1, stderr="connection refused")

    with pytest.raises(RuntimeError, match="connection refused"):
        backup.executar({"SUPABASE_DB_URL": URL, "BACKUP_DIR": str(tmp_path), "BACKUP_MANTER": "1"}, rodar=rodar_falho)

    assert [p.name for p in tmp_path.iterdir()] == [existente.name]


def test_ler_config_ignora_comentarios(tmp_path):
    arq = tmp_path / "agente.env"
    arq.write_text("# comentário\nSUPABASE_DB_URL=\"postgresql://a:b@c/d\"\n\nBACKUP_DIR=C:\\b\n", encoding="utf-8-sig")
    assert backup.ler_config(arq) == {"SUPABASE_DB_URL": "postgresql://a:b@c/d", "BACKUP_DIR": "C:\\b"}
