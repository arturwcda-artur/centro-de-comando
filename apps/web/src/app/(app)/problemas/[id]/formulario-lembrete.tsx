"use client";
import Link from "next/link";
import { useActionState } from "react";
import { BotaoEnviar, CampoSelecao, CampoTexto } from "@/components/formulario";
import { Aviso } from "@/components/ui";
import { DURACAO_PADRAO, DURACOES } from "@/lib/pomodoro";
import { buscarHorarioLivre, criarLembreteDeAcao } from "../../agenda/acoes";

const dataBr = (iso: string) => iso.split("-").reverse().join("/");
const semana = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" });

/**
 * Lembrete em blocos de pomodoro: primeiro busca horários livres no Google Agenda (seg a sex,
 * 08:00 às 16:00, sem o almoço), depois cria o evento no horário escolhido (RN-49i).
 */
export function FormularioLembrete({ tarefaId, dataSugerida, prazo }: { tarefaId: string; dataSugerida: string; prazo: string | null }) {
  const [busca, buscar] = useActionState(buscarHorarioLivre, {});
  const [criado, criar] = useActionState(criarLembreteDeAcao.bind(null, tarefaId), {});

  if (criado.ok)
    return (
      <Aviso tipo="info">
        {criado.mensagem}{" "}
        <Link href="/agenda" className="underline">
          Ver na agenda
        </Link>
      </Aviso>
    );

  return (
    <div className="space-y-4">
      <form action={buscar} className="space-y-3">
        {busca.erro && <Aviso>{busca.erro}</Aviso>}
        <div className="grid gap-3 sm:grid-cols-2">
          <CampoTexto nome="data" rotulo="Dia" type="date" defaultValue={dataSugerida} required ajuda={prazo ? `Prazo da ação: ${prazo}. Sugestão: um dia antes.` : "Ação sem prazo."} />
          <CampoSelecao nome="duracao" rotulo="Duração" opcoes={DURACOES.map((d) => ({ valor: String(d), rotulo: `${d} minutos` }))} defaultValue={String(DURACAO_PADRAO)} />
        </div>
        <BotaoEnviar variante="secundario">Buscar horário livre</BotaoEnviar>
      </form>

      {busca.opcoes && (
        <form action={criar} className="space-y-3">
          {criado.erro && <Aviso>{criado.erro}</Aviso>}
          {busca.aviso && <Aviso tipo="info">{busca.aviso}</Aviso>}
          {busca.opcoes.length === 0 ? (
            <Aviso>Nenhum horário livre nos próximos dias úteis. Escolha outro dia.</Aviso>
          ) : (
            <>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Horários livres na sua agenda</legend>
                {busca.opcoes.map((o, i) => (
                  <label key={`${o.data}${o.inicio}`} className="flex items-center gap-2 text-sm">
                    <input type="radio" name="horario" value={`${o.data}|${o.inicio}|${o.fim}`} defaultChecked={i === 0} />
                    {semana(o.data)}, {dataBr(o.data)}, das {o.inicio} às {o.fim}
                  </label>
                ))}
              </fieldset>
              <BotaoEnviar>Criar lembrete neste horário</BotaoEnviar>
            </>
          )}
        </form>
      )}
    </div>
  );
}
