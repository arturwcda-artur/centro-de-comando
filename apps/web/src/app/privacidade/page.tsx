import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de Privacidade" };

/** Página pública exigida pelo Google para publicar o app. Sem dados do sistema (ADR 0014). */
export default function PaginaPrivacidade() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-10 text-sm leading-relaxed">
      <h1 className="text-2xl font-semibold tracking-tight">Política de Privacidade</h1>
      <p>O Centro de Comando é um sistema privado de gestão de obras, usado por uma única pessoa, seu proprietário. Não há cadastro público.</p>
      <h2 className="text-base font-semibold">Dados do Google</h2>
      <p>Com a autorização do proprietário, o sistema acessa os eventos da agenda principal dele no Google Agenda para exibir, criar, alterar e excluir compromissos.</p>
      <p>Esses dados são usados apenas dentro do sistema. Não são vendidos, compartilhados com terceiros nem usados para publicidade.</p>
      <h2 className="text-base font-semibold">Armazenamento e segurança</h2>
      <p>Uma cópia dos eventos fica em banco de dados protegido, acessível só com senha e segundo fator. A credencial de acesso ao Google fica cifrada.</p>
      <h2 className="text-base font-semibold">Revogação</h2>
      <p>O acesso pode ser cancelado a qualquer momento em myaccount.google.com, na área de Segurança, em apps de terceiros.</p>
    </main>
  );
}
