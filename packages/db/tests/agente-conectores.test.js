// Leituras do agente nas integrações (migration 0027). Banco descartável.
import { beforeAll, describe, expect, it } from 'vitest';
import { PROPRIETARIO, como, criarBanco } from './helpers.js';

let db;
const registrar = (ferramenta, lidos, ignorados, erros, mensagem) =>
  como(db, 'agente_cronograma', null, (tx) => tx.query(`select public.registrar_execucao_agente($1, $2, $3, $4, $5)`, [ferramenta, lidos, ignorados, erros, mensagem]));
const conector = async (f) => (await db.query(`select * from public.conectores where ferramenta = $1`, [f])).rows[0];

beforeAll(async () => {
  db = await criarBanco();
});

describe('registrar_execucao_agente', () => {
  it('cria o conector e registra a execução', async () => {
    await registrar('msproject', 4, 0, 0, 'Lidos: 4');
    const c = await conector('msproject');
    expect(c).toMatchObject({ nome_exibicao: 'MS Project', ativo: true, estado_conexao: 'conectado', intervalo_minutos: 10080 });
    expect(c.ultima_sync_em).not.toBeNull();
    const e = await db.query(`select status, lidos from public.sync_execucoes where conector_id = $1`, [c.id]);
    expect(e.rows).toEqual([{ status: 'sucesso', lidos: 4 }]);
  });

  it('com erro, marca o conector e a execução', async () => {
    await registrar('excel', 0, 0, 1, 'Arquivo não encontrado');
    const c = await conector('excel');
    expect(c.estado_conexao).toBe('erro');
    const e = await db.query(`select status from public.sync_execucoes where conector_id = $1`, [c.id]);
    expect(e.rows[0].status).toBe('parcial');
  });

  it('repetir não duplica o conector', async () => {
    await registrar('pastas', 1, 0, 0, 'a');
    await registrar('pastas', 0, 1, 0, 'b');
    const n = await db.query(`select count(*)::int n from public.conectores where ferramenta = 'pastas'`);
    expect(n.rows[0].n).toBe(1);
  });

  it('recusa ferramenta que não é do agente', async () => {
    await expect(registrar('trello', 0, 0, 0, 'x')).rejects.toThrow(/inválida/);
  });

  it('usuário logado não usa a função', async () => {
    await expect(como(db, 'authenticated', PROPRIETARIO, (tx) => tx.query(`select public.registrar_execucao_agente('pastas', 0, 0, 0, 'x')`))).rejects.toThrow(/permission denied/);
  });
});
