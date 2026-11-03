import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { configSupabase } from "./config";

/** Cliente Supabase para Server Components, Server Actions e Route Handlers (sessão do usuário, com RLS). */
export async function criarClienteServidor() {
  const { url, chave } = configSupabase();
  const cookieStore = await cookies();
  return createServerClient<Database>(url, chave, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(lista) {
        try {
          lista.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado a partir de Server Component: o proxy já renova a sessão.
        }
      },
    },
  });
}
