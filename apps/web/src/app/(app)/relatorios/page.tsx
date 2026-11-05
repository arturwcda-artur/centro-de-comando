import type { Metadata } from "next";
import { Download, FileText } from "lucide-react";
import Link from "next/link";
import { Cartao, EstadoVazio } from "@/components/ui";
import { PERIODOS } from "@/lib/equipe-dados";
import { exigirSessaoCompleta } from "@/lib/sessao";

export const metadata: Metadata = { title: "Relatórios" };

const LINK = "inline-flex h-9 items-center gap-2 rounded-lg border border-borda px-3 text-sm hover:bg-superficie-2";

export default async function PaginaRelatorios() {
  const { supabase } = await exigirSessaoCompleta();
  const [obras, contratos, arquivos] = await Promise.all([
    supabase.from("obras").select("id, codigo").is("arquivado_em", null).order("codigo"),
    supabase.from("contratos").select("id, numero, obra_id, obras(codigo)").is("arquivado_em", null),
    supabase.from("cronograma_arquivos").select("obra_id"),
  ]);
  const comDados = new Set([...(contratos.data ?? []).map((c) => c.obra_id), ...(arquivos.data ?? []).map((a) => a.obra_id)]);
  const obrasComDados = (obras.data ?? []).filter((o) => comDados.has(o.id));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
        <p className="text-sm text-suave">Gerados na hora, com os mesmos números das telas. Uso interno.</p>
      </div>

      <Cartao titulo="KPI da equipe">
        <p className="mb-3 text-sm text-suave">PDF de 1 página com tarefas resolvidas, tempo, evolução e cartões parados.</p>
        <div className="flex flex-wrap gap-2">
          {PERIODOS.map((p) => (
            <Link key={p.valor} href={`/relatorios/equipe?periodo=${p.valor}`} target="_blank" className={LINK}>
              <FileText className="size-4" aria-hidden="true" /> {p.rotulo}
            </Link>
          ))}
        </div>
      </Cartao>

      <Cartao titulo="Situação da obra">
        <p className="mb-3 text-sm text-suave">PDF com prazo, Curva S, contrato, medições, aditivos, riscos e tarefas.</p>
        {obrasComDados.length === 0 ? (
          <EstadoVazio>Nenhuma obra com cronograma ou contrato.</EstadoVazio>
        ) : (
          <div className="flex flex-wrap gap-2">
            {obrasComDados.map((o) => (
              <Link key={o.id} href={`/relatorios/obra/${o.id}`} target="_blank" className={LINK}>
                <FileText className="size-4" aria-hidden="true" /> {o.codigo}
              </Link>
            ))}
          </div>
        )}
      </Cartao>

      <Cartao titulo="Medições e contrato">
        <p className="mb-3 text-sm text-suave">Excel com resumo, medições, saldo por serviço, aditivos e lançamentos.</p>
        {(contratos.data ?? []).length === 0 ? (
          <EstadoVazio>Nenhum contrato cadastrado.</EstadoVazio>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(contratos.data ?? []).map((c) => (
              // Link comum: a rota devolve um arquivo para baixar
              <a key={c.id} href={`/api/relatorios/contrato/${c.id}`} className={LINK}>
                <Download className="size-4" aria-hidden="true" /> {c.obras?.codigo} · {c.numero}
              </a>
            ))}
          </div>
        )}
      </Cartao>
    </div>
  );
}
