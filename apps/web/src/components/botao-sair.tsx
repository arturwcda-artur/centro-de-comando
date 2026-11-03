import { LogOut } from "lucide-react";

/** Encerra a sessão (POST, para não ser disparado por um simples link). */
export function BotaoSair({ escuro = false }: { escuro?: boolean }) {
  return (
    <form action="/sair" method="post">
      <button
        type="submit"
        className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
          escuro ? "text-lateral-texto hover:bg-lateral-ativo hover:text-white" : "text-suave hover:bg-superficie-2 hover:text-texto"
        }`}
      >
        <LogOut className="size-4" aria-hidden="true" />
        Sair
      </button>
    </form>
  );
}
