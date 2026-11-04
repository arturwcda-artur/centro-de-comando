import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cartao } from "@/components/ui";
import { carregarOpcoes, UUID } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { salvarContrato } from "../../acoes";
import { FormularioContrato } from "../../formulario-contrato";

export const metadata: Metadata = { title: "Editar contrato" };

export default async function PaginaEditarContrato({ params }: PageProps<"/contratos/[id]/editar">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await exigirSessaoCompleta();
  const [contrato, arquivo, opcoes, obras] = await Promise.all([
    supabase.from("contratos").select("*").eq("id", id).maybeSingle(),
    supabase.from("medicao_arquivos").select("caminho").eq("contrato_id", id).maybeSingle(),
    carregarOpcoes(supabase),
    supabase.from("obras").select("id, codigo, nome").order("codigo"),
  ]);
  if (!contrato.data) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href={`/contratos/${id}`} className="text-sm text-suave hover:text-texto">
          ← Contrato
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Editar contrato</h1>
      </div>
      <Cartao>
        <FormularioContrato
          acao={salvarContrato.bind(null, id)}
          contrato={{ ...contrato.data, planilha: arquivo.data?.caminho }}
          obras={(obras.data ?? []).map((o) => ({ valor: o.id, rotulo: `${o.codigo} — ${o.nome}` }))}
          contratantes={opcoes.contratantes}
          sugestoes={{}}
        />
      </Cartao>
    </div>
  );
}
