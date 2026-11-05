import type { Metadata } from "next";
import Link from "next/link";
import { Cartao } from "@/components/ui";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { FormularioDemanda } from "./formulario";

export const metadata: Metadata = { title: "Nova demanda no Notion" };

export default async function PaginaNovaDemanda() {
  await exigirSessaoCompleta();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/tarefas" className="text-sm text-suave hover:text-texto">
          ← Tarefas
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Nova demanda no Notion</h1>
        <p className="text-sm text-suave">Cria a demanda na base Demandas Ativas. Ela aparece aqui na próxima sincronização.</p>
      </div>
      <Cartao>
        <FormularioDemanda />
      </Cartao>
    </div>
  );
}
