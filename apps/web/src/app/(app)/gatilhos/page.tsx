import type { Metadata } from "next";
import { Aviso, Cartao } from "@/components/ui";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { FormularioGatilhos } from "./formulario";

export const metadata: Metadata = { title: "Gatilhos" };

/** Gatilhos do comandante (Doutrina do Centro de Comando, RN-49u). */
export default async function PaginaGatilhos() {
  const { supabase } = await exigirSessaoCompleta();
  const { data, error } = await supabase.from("gatilhos").select("chave, titulo, ativo, limite, unidade").order("ordem");
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gatilhos</h1>
        <p className="text-sm text-suave">
          Só toca o alarme o que estiver ligado aqui. Ligado, o item fica vermelho na ficha da obra e na Sala de Situação e entra na Mesa. Desligado, continua visível como Atenção, mas não vai para a Mesa.
        </p>
      </div>
      <Cartao>{error || !data?.length ? <Aviso>Não foi possível ler os gatilhos agora.</Aviso> : <FormularioGatilhos linhas={data} />}</Cartao>
    </div>
  );
}
