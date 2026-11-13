import type { Metadata } from "next";
import Link from "next/link";
import { Cartao, EstadoVazio, Etiqueta } from "@/components/ui";
import type { Alerta } from "@/lib/alertas";
import { carregarAlertas } from "@/lib/alertas-dados";
import { exigirSessaoCompleta } from "@/lib/sessao";

export const metadata: Metadata = { title: "Alertas" };

const GRUPOS: Alerta["grupo"][] = ["Integrações", "Problemas", "Contratos", "Prazos", "Equipe"];

export default async function PaginaAlertas() {
  const { supabase } = await exigirSessaoCompleta();
  const alertas = await carregarAlertas(supabase);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Alertas</h1>
        <p className="text-sm text-suave">O que precisa da sua atenção agora, calculado a cada abertura da tela.</p>
      </div>
      {alertas.length === 0 && (
        <Cartao>
          <EstadoVazio>Nenhum alerta no momento.</EstadoVazio>
        </Cartao>
      )}
      {GRUPOS.map((grupo) => {
        const lista = alertas.filter((a) => a.grupo === grupo);
        if (lista.length === 0) return null;
        return (
          <Cartao key={grupo} titulo={grupo}>
            <ul className="divide-y divide-borda">
              {lista.map((a) => (
                <li key={a.texto}>
                  <Link href={a.href} className="flex items-start justify-between gap-3 py-2.5 text-sm hover:text-marca">
                    <span>{a.texto}</span>
                    <Etiqueta tom={a.grave ? "alerta" : "atencao"}>{a.grave ? "Urgente" : "Atenção"}</Etiqueta>
                  </Link>
                </li>
              ))}
            </ul>
          </Cartao>
        );
      })}
    </div>
  );
}
