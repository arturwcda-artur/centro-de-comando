export function concluirCartaoTrello(credenciais: { chave: string; token: string }, idCartao: string): Promise<string>;
export function listasDoCartao(credenciais: { chave: string; token: string }, idCartao: string): Promise<{ id: string; nome: string }[]>;
export function criarCartaoDeComentario(
  credenciais: { chave: string; token: string },
  dados: { idCartaoOrigem: string; idLista: string; titulo: string; texto: string },
): Promise<{ id: string; url: string }>;
export function criarDemandaNotion(
  token: string,
  dados: { titulo: string; prazo: string | null; prioridade: string; categoria: string; responsavel: string | null; observacoes: string | null },
): Promise<{ id: string; url: string }>;
export function concluirPaginaNotion(token: string, idPagina: string): Promise<string>;
