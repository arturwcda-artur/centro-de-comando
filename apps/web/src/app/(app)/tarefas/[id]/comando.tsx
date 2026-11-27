import { Aviso, Cartao } from "@/components/ui";
import { PRIORIDADES } from "@/lib/cartao-acao";
import { hojeSP, somarDias } from "@/lib/formato";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { lerQuadros } from "../../mesa/detalhe";
import { FormularioDelegar, FormularioNaoSeAplica } from "../../mesa/formularios";
import { FormularioLembrete } from "../../problemas/[id]/formulario-lembrete";
import { adiarTarefa, delegarTarefa, fazerEu, naoSeAplicaTarefa } from "../acoes-comando";
import { FormularioAdiar } from "./formulario-adiar";

const SECAO = "rounded-lg border border-borda px-3 py-2";
const TITULO = "cursor-pointer text-sm font-semibold";

/**
 * Os mesmos 4 botões da Mesa, na tarefa (Doutrina do Centro de Comando, RN-49q).
 * Cada um abre só quando é escolhido, para a tela continuar simples.
 */
export async function ComandoDaTarefa({ tarefa }: { tarefa: { id: string; titulo: string; prazo: string | null } }) {
  const { supabase } = await exigirSessaoCompleta();
  const [{ data: membros }, { quadros, falha }] = await Promise.all([supabase.from("trello_membros").select("id, nome").order("nome"), lerQuadros()]);
  const hoje = hojeSP();
  const dataSugerida = tarefa.prazo && tarefa.prazo > hoje ? somarDias(tarefa.prazo, -1) : hoje;

  return (
    <Cartao titulo="O que fazer com esta tarefa">
      <div className="space-y-2">
        <details className={SECAO}>
          <summary className={TITULO}>Fazer eu</summary>
          <p className="mt-2 mb-3 text-xs text-suave">Reserva um horário livre na sua Agenda e a tarefa fica com você. A equipe não vê.</p>
          <FormularioLembrete tarefaId={tarefa.id} dataSugerida={dataSugerida} prazo={tarefa.prazo} acao={fazerEu.bind(null, tarefa.id)} rotulo="Reservar este horário" />
        </details>
        <details className={SECAO}>
          <summary className={TITULO}>Delegar para a equipe</summary>
          <p className="mt-2 mb-3 text-xs text-suave">Cria o cartão no quadro da equipe no Trello. Depois disso, a tarefa acompanha o cartão.</p>
          {falha ? (
            <Aviso>{falha}</Aviso>
          ) : (
            <FormularioDelegar acao={delegarTarefa.bind(null, tarefa.id)} quadros={quadros} membros={(membros ?? []).map((m) => ({ valor: m.id, rotulo: m.nome }))} prioridades={PRIORIDADES.map((p) => ({ valor: p.valor, rotulo: p.rotulo }))} tituloInicial={tarefa.titulo.slice(0, 300)} />
          )}
        </details>
        <details className={SECAO}>
          <summary className={TITULO}>Adiar</summary>
          <div className="mt-3">
            <FormularioAdiar acao={adiarTarefa.bind(null, tarefa.id)} amanha={somarDias(hoje, 1)} />
          </div>
        </details>
        <details className={SECAO}>
          <summary className={TITULO}>Não se aplica mais</summary>
          <div className="mt-3">
            <FormularioNaoSeAplica acao={naoSeAplicaTarefa.bind(null, tarefa.id)} />
          </div>
        </details>
      </div>
    </Cartao>
  );
}
