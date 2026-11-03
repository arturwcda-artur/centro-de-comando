/** URL e chave pública (anon/publishable) do Supabase. A chave pública é segura no navegador: o RLS protege os dados. */
export function configSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chave) {
    throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (ver .env.example).");
  }
  return { url, chave };
}
