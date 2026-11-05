import { describe, expect, it } from 'vitest';
import { conferir } from '../../../scripts/conferir-producao.mjs';

const BASE = 'https://site.test';

/** Simula o site publicado, sem rede. `trocar` altera uma resposta para provocar falha. */
const site = (trocar = () => null) => async (url, opcoes = {}) => {
  const caminho = String(url).replace(BASE, '');
  const mudada = trocar(caminho, opcoes);
  if (mudada) return mudada;
  if (caminho === '/login') return new Response('', { status: 200, headers: { 'strict-transport-security': 'max-age=63072000' } });
  if (caminho === '/privacidade' || String(url).includes('oauth-authorization-server')) return new Response('', { status: 200 });
  if (caminho === '/api/mcp') return new Response(null, { status: 401, headers: { 'www-authenticate': 'Bearer resource_metadata="x"' } });
  if (caminho.startsWith('/.well-known')) return Response.json({ resource: `${BASE}/api/mcp` });
  return new Response(null, { status: 307, headers: { location: `${BASE}/login` } });
};

describe('conferência da produção', () => {
  it('passa quando tudo está protegido', async () => {
    expect(await conferir(BASE, site())).toEqual([]);
  });

  it('avisa tela aberta sem login', async () => {
    const falhas = await conferir(BASE, site((c) => (c === '/contratos' ? new Response('', { status: 200 }) : null)));
    expect(falhas).toEqual(['/contratos não exigiu login (200)']);
  });

  it('avisa conector aceitando chave falsa', async () => {
    const falhas = await conferir(BASE, site((c, o) => (c === '/api/mcp' && o.headers?.authorization ? new Response('{}', { status: 200 }) : null)));
    expect(falhas).toEqual(['conector com chave falsa respondeu 200']);
  });

  it('avisa servidor de autorização desligado', async () => {
    const falhas = await conferir(BASE, site((c) => (c.includes('oauth-authorization-server') ? new Response('', { status: 404 }) : null)));
    expect(falhas).toEqual(['servidor OAuth respondeu 404']);
  });
});
