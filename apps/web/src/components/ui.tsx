import type { ComponentProps, ReactNode } from "react";

export function Botao({ className = "", ...props }: ComponentProps<"button">) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-marca px-4 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}

export function Campo({ rotulo, id, ...props }: ComponentProps<"input"> & { rotulo: string; id: string }) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-sm font-medium">{rotulo}</span>
      <input
        id={id}
        className="h-10 w-full rounded-lg border border-borda bg-superficie-2 px-3 text-sm outline-none transition focus:border-marca focus:ring-2 focus:ring-marca/20"
        {...props}
      />
    </label>
  );
}

export function Aviso({ tipo = "alerta", children }: { tipo?: "alerta" | "info"; children: ReactNode }) {
  const cores = tipo === "alerta" ? "bg-alerta-suave text-alerta" : "bg-marca-suave text-marca";
  return (
    <p role={tipo === "alerta" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-sm ${cores}`}>
      {children}
    </p>
  );
}

export function Cartao({ titulo, acao, children, className = "" }: { titulo?: string; acao?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-borda bg-superficie p-4 sm:p-5 ${className}`}>
      {(titulo || acao) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          {titulo && <h2 className="text-sm font-semibold">{titulo}</h2>}
          {acao}
        </header>
      )}
      {children}
    </section>
  );
}

export function EstadoVazio({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-borda px-3 py-6 text-center text-sm text-suave">{children}</p>;
}

export function Etiqueta({ tom = "neutro", children }: { tom?: "neutro" | "alerta" | "atencao" | "ok" | "marca"; children: ReactNode }) {
  const cores = {
    neutro: "bg-superficie-2 text-suave border border-borda",
    alerta: "bg-alerta-suave text-alerta",
    atencao: "bg-atencao-suave text-atencao",
    ok: "bg-ok-suave text-ok",
    marca: "bg-marca-suave text-marca",
  }[tom];
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${cores}`}>{children}</span>;
}
