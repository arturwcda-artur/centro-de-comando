import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoEnviar } from "@/components/formulario";
import { Cartao } from "@/components/ui";
import { carregarOpcoes, UUID } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { arquivarObra, salvarObra } from "../../acoes";
import { FormularioObra } from "../../formulario-obra";

export const metadata: Metadata = { title: "Editar obra" };

export default async function PaginaEditarObra({ params }: PageProps<"/obras/[id]/editar">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await exigirSessaoCompleta();
  const [{ data: obra }, opcoes] = await Promise.all([
    supabase.from("obras").select("*").eq("id", id).maybeSingle(),
    carregarOpcoes(supabase),
  ]);
  if (!obra) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href={`/obras/${id}`} className="text-sm text-suave hover:text-texto">
          ← {obra.codigo}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Editar obra</h1>
      </div>
      <Cartao>
        <FormularioObra acao={salvarObra.bind(null, id)} obra={obra} empresas={opcoes.empresas} contratantes={opcoes.contratantes} />
      </Cartao>
      <Cartao titulo="Arquivar obra">
        <p className="mb-3 text-sm text-suave">
          Arquivar tira a obra das listas e do painel. Nada é apagado: o histórico, a auditoria e os registros vinculados
          continuam no banco.
        </p>
        <form action={arquivarObra.bind(null, id)}>
          <BotaoEnviar variante="perigo">Arquivar obra</BotaoEnviar>
        </form>
      </Cartao>
    </div>
  );
}
