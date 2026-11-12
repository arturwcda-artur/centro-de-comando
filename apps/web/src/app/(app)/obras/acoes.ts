"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { UUID } from "@/lib/obras";
import {
  aprovacaoSchema,
  decisaoSchema,
  mensagemDoBanco,
  obraSchema,
  riscoSchema,
  validar,
  type EstadoFormulario,
} from "@/lib/validacao";

/** Cria (id nulo) ou atualiza uma obra. Toda ação revalida a sessão no servidor; o RLS protege o banco. */
export async function salvarObra(id: string | null, _: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  const { supabase } = await exigirSessaoCompleta();
  const { dados, erros } = validar(obraSchema, fd);
  if (!dados) return { erros };
  const { planilha_acoes, ...obra } = dados;

  const resposta = id
    ? await supabase.from("obras").update(obra).eq("id", id).select("id").single()
    : await supabase.from("obras").insert(obra).select("id").single();
  if (resposta.error) return { erro: mensagemDoBanco(resposta.error) };

  // Plano de ações (RN-49f): o agente local passa a ler esta planilha. Trocar o caminho força nova leitura.
  if (planilha_acoes) {
    const { error } = await supabase
      .from("acoes_planilhas")
      .upsert({ obra_id: resposta.data.id, caminho: planilha_acoes, ultimo_hash: null }, { onConflict: "obra_id" });
    if (error) return { erro: mensagemDoBanco(error) };
  }

  revalidatePath("/obras");
  revalidatePath("/");
  redirect(`/obras/${resposta.data.id}`);
}

export async function arquivarObra(id: string) {
  const { supabase } = await exigirSessaoCompleta();
  if (!UUID.test(id)) return;
  await supabase.from("obras").update({ arquivado_em: new Date().toISOString() }).eq("id", id);
  revalidatePath("/obras");
  redirect("/obras");
}

async function obterOuCriar(
  supabase: Awaited<ReturnType<typeof exigirSessaoCompleta>>["supabase"],
  tabela: "empresas" | "contratantes",
  id: string | null,
  novoNome: string | null,
): Promise<{ id: string | null; erro?: string }> {
  if (id || !novoNome) return { id };
  // Evita duplicar: reaproveita cadastro com o mesmo nome (sem diferenciar maiúsculas)
  const nomeExato = novoNome.replace(/[\\%_]/g, (c) => `\\${c}`);
  const existente =
    tabela === "empresas"
      ? await supabase.from("empresas").select("id").ilike("razao_social", nomeExato).is("arquivado_em", null).limit(1).maybeSingle()
      : await supabase.from("contratantes").select("id").ilike("nome", nomeExato).is("arquivado_em", null).limit(1).maybeSingle();
  if (existente.data) return { id: existente.data.id };
  const r =
    tabela === "empresas"
      ? await supabase.from("empresas").insert({ razao_social: novoNome }).select("id").single()
      : await supabase.from("contratantes").insert({ nome: novoNome }).select("id").single();
  return r.error ? { id: null, erro: mensagemDoBanco(r.error) } : { id: r.data.id };
}

/** Importação assistida: aprova uma proposta (cria empresa/contratante novos se digitados). */
export async function aprovarProposta(_: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  const { supabase } = await exigirSessaoCompleta();
  const { dados, erros } = validar(aprovacaoSchema, fd);
  if (!dados) return { erros };

  const empresa = await obterOuCriar(supabase, "empresas", dados.empresa_id, dados.nova_empresa);
  if (empresa.erro) return { erro: empresa.erro };
  const contratante = await obterOuCriar(supabase, "contratantes", dados.contratante_id, dados.novo_contratante);
  if (contratante.erro) return { erro: contratante.erro };

  const { error } = await supabase.rpc("aprovar_importacao_obra", {
    p_id: dados.proposta_id,
    p_codigo: dados.codigo,
    p_nome: dados.nome,
    p_situacao: dados.situacao,
    // Parâmetros opcionais: undefined = usar o padrão da função (null)
    p_empresa_id: empresa.id ?? undefined,
    p_contratante_id: contratante.id ?? undefined,
    p_cidade: dados.cidade ?? undefined,
    p_uf: dados.uf ?? undefined,
  });
  if (error) return { erro: mensagemDoBanco(error) };

  revalidatePath("/obras", "layout");
  revalidatePath("/");
  return { ok: true, mensagem: `Obra ${dados.codigo} cadastrada.` };
}

export async function descartarProposta(id: string) {
  const { supabase } = await exigirSessaoCompleta();
  if (!UUID.test(id)) return;
  await supabase.from("importacao_obras").update({ status: "descartada", revisado_em: new Date().toISOString() }).eq("id", id).eq("status", "pendente");
  revalidatePath("/obras/importar");
}

export async function reabrirProposta(id: string) {
  const { supabase } = await exigirSessaoCompleta();
  if (!UUID.test(id)) return;
  await supabase.from("importacao_obras").update({ status: "pendente", revisado_em: null }).eq("id", id).eq("status", "descartada");
  revalidatePath("/obras/importar");
}

export async function salvarRisco(_: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  const { supabase } = await exigirSessaoCompleta();
  const { dados, erros } = validar(riscoSchema, fd);
  if (!dados) return { erros };
  const { error } = await supabase.from("riscos").insert(dados);
  if (error) return { erro: mensagemDoBanco(error) };
  revalidatePath(`/obras/${dados.obra_id}`);
  revalidatePath("/riscos");
  return { ok: true, mensagem: "Risco registrado." };
}

export async function salvarDecisao(_: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  const { supabase } = await exigirSessaoCompleta();
  const { dados, erros } = validar(decisaoSchema, fd);
  if (!dados) return { erros };
  const { error } = await supabase.from("decisoes").insert(dados);
  if (error) return { erro: mensagemDoBanco(error) };
  revalidatePath(`/obras/${dados.obra_id}`);
  revalidatePath("/riscos");
  revalidatePath("/");
  return { ok: true, mensagem: "Decisão registrada." };
}

const STATUS_RISCO_OK = new Set(["aberto", "em_tratamento", "mitigado", "materializado", "encerrado"]);
const STATUS_DECISAO_OK = new Set(["pendente", "tomada", "implementada", "cancelada"]);

export async function alterarStatus(fd: FormData) {
  const { supabase } = await exigirSessaoCompleta();
  const tabela = String(fd.get("tabela"));
  const id = String(fd.get("id"));
  const status = String(fd.get("status"));
  const obraId = String(fd.get("obra_id") ?? "");
  if (!UUID.test(id)) return;
  if (tabela === "riscos" && STATUS_RISCO_OK.has(status)) {
    await supabase.from("riscos").update({ status }).eq("id", id);
  } else if (tabela === "decisoes" && STATUS_DECISAO_OK.has(status)) {
    // "tomada" exige o texto da decisão (CHECK no banco): se faltar, o banco recusa e nada muda
    await supabase
      .from("decisoes")
      .update({ status, ...(status === "tomada" ? { data_decisao: new Date().toISOString().slice(0, 10) } : {}) })
      .eq("id", id);
  }
  if (UUID.test(obraId)) revalidatePath(`/obras/${obraId}`);
  revalidatePath("/riscos");
  revalidatePath("/");
}
