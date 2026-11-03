import { Suspense, type ReactNode } from "react";
import { BotaoSair } from "@/components/botao-sair";
import { BuscaGlobal } from "@/components/busca-global";
import { MenuLateral } from "@/components/menu-lateral";
import { exigirSessaoCompleta } from "@/lib/sessao";

export default async function LayoutAplicacao({ children }: { children: ReactNode }) {
  const { usuario } = await exigirSessaoCompleta();

  const rodape = (
    <div className="space-y-1">
      <p className="truncate px-3 text-xs text-lateral-texto/70" title={usuario.email}>
        {usuario.email}
      </p>
      <BotaoSair escuro />
    </div>
  );

  return (
    <div className="min-h-dvh lg:pl-64">
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-borda bg-superficie/90 px-4 backdrop-blur sm:px-6">
        <MenuLateral rodape={rodape} />
        <Suspense>
          <BuscaGlobal />
        </Suspense>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
