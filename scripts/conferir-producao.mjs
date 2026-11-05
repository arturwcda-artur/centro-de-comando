// Confere o sistema publicado sem usar login nem dados: páginas públicas, bloqueios e conector.
// Uso: node scripts/conferir-producao.mjs [endereço]. Roda todo dia pelo workflow conferir-producao.yml.
export const PROTEGIDAS = ['/', '/meu-dia', '/alertas', '/obras', '/tarefas', '/equipe', '/agenda', '/planejamento', '/contratos', '/documentos', '/riscos', '/relatorios', '/cadastros', '/integracoes', '/oauth/consent?authorization_id=x'];

const SUPABASE = 'https://maocgnsdhozsyrbxvqvr.supabase.co';

export async function conferir(base, buscar = fetch) {
  const falhas = [];
  const exigir = (condicao, texto) => {
    if (!condicao) falhas.push(texto);
  };
  const pedir = (caminho, opcoes = {}) => buscar(`${base}${caminho}`, { redirect: 'manual', ...opcoes });

  const login = await pedir('/login');
  exigir(login.status === 200, `/login respondeu ${login.status}`);
  exigir(/max-age=\d+/.test(login.headers.get('strict-transport-security') ?? ''), '/login sem HSTS');
  const privacidade = await pedir('/privacidade');
  exigir(privacidade.status === 200, `/privacidade respondeu ${privacidade.status}`);

  for (const caminho of PROTEGIDAS) {
    const r = await pedir(caminho);
    const destino = r.headers.get('location') ?? '';
    exigir(r.status >= 300 && r.status < 400 && destino.endsWith('/login'), `${caminho} não exigiu login (${r.status})`);
  }

  const mcp = { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' };
  const semChave = await pedir('/api/mcp', mcp);
  exigir(semChave.status === 401, `conector sem chave respondeu ${semChave.status}`);
  exigir((semChave.headers.get('www-authenticate') ?? '').includes('resource_metadata='), 'conector sem aviso de autorização');
  const chaveFalsa = await pedir('/api/mcp', { ...mcp, headers: { ...mcp.headers, authorization: 'Bearer falsa' } });
  exigir(chaveFalsa.status === 401, `conector com chave falsa respondeu ${chaveFalsa.status}`);

  const recurso = await pedir('/.well-known/oauth-protected-resource/api/mcp');
  exigir(recurso.status === 200, `metadados do conector responderam ${recurso.status}`);
  if (recurso.status === 200) exigir((await recurso.json()).resource === `${base}/api/mcp`, 'metadados com endereço errado');

  const servidor = await buscar(`${SUPABASE}/.well-known/oauth-authorization-server/auth/v1`);
  exigir(servidor.status === 200, `servidor OAuth respondeu ${servidor.status}`);
  return falhas;
}

if (process.argv[1]?.endsWith('conferir-producao.mjs')) {
  const base = process.argv[2] ?? 'https://centro-de-comando-chi.vercel.app';
  const falhas = await conferir(base);
  for (const f of falhas) console.error(`FALHA: ${f}`);
  console.log(falhas.length ? `${falhas.length} falha(s).` : `Tudo certo em ${base}.`);
  process.exit(falhas.length ? 1 : 0);
}
