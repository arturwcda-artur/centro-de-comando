export function concluirCartaoTrello(credenciais: { chave: string; token: string }, idCartao: string): Promise<string>;
export function listasDoCartao(credenciais: { chave: string; token: string }, idCartao: string): Promise<{ id: string; nome: string }[]>;
export function criarCartaoDeComentario(
  credenciais: { chave: string; token: string },
  dados: { idCartaoOrigem: string; idLista: string; titulo: string; texto: string },
): Promise<{ id: string; url: string }>;
export const PRIORIDADES_TRELLO: Record<"alta" | "media" | "baixa", { nome: string; cor: string }>;
export function listasDoQuadroPorNome(credenciais: { chave: string; token: string }, nomeQuadro: string): Promise<{ id: string; nome: string }[]>;
export function criarCartaoNoQuadro(
  credenciais: { chave: string; token: string },
  dados: { nomeQuadro: string; idLista: string; titulo: string; descricao?: string; prazo?: string | null; idMembro?: string | null; prioridade?: "alta" | "media" | "baixa" | null },
): Promise<{ id: string; url: string; lista: string }>;
