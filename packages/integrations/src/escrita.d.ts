export function concluirCartaoTrello(credenciais: { chave: string; token: string }, idCartao: string): Promise<string>;
export function listasDoCartao(credenciais: { chave: string; token: string }, idCartao: string): Promise<{ id: string; nome: string }[]>;
export function criarCartaoDeComentario(
  credenciais: { chave: string; token: string },
  dados: { idCartaoOrigem: string; idLista: string; titulo: string; texto: string },
): Promise<{ id: string; url: string }>;
