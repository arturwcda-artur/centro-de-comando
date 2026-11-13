"use client";
import Link from "next/link";
import { useActionState } from "react";
import { BotaoEnviar, CampoTexto } from "@/components/formulario";
import { Aviso } from "@/components/ui";
import { criarLembreteDeAcao } from "../../agenda/acoes";

export function FormularioLembrete({ tarefaId, dataSugerida, prazo }: { tarefaId: string; dataSugerida: string; prazo: string | null }) {
  const [estado, enviar] = useActionState(criarLembreteDeAcao.bind(null, tarefaId), {});
  return (
    <form action={enviar} className="space-y-3">
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      {estado.mensagem && (
        <Aviso tipo="info">
          {estado.mensagem}{" "}
          <Link href="/agenda" className="underline">
            Ver na agenda
          </Link>
        </Aviso>
      )}
      <CampoTexto nome="data" rotulo="Dia do lembrete" type="date" defaultValue={dataSugerida} required erro={estado.erros?.data} ajuda={prazo ? `Prazo da ação: ${prazo}. Sugestão: um dia antes.` : "Ação sem prazo na planilha."} />
      <p className="text-xs text-suave">Cria um evento de dia inteiro no seu Google Agenda, com o 5W2H na descrição.</p>
      <BotaoEnviar>Criar lembrete na agenda</BotaoEnviar>
    </form>
  );
}
