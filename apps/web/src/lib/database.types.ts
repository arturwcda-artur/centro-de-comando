export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      aditivos: {
        Row: {
          atualizado_em: string
          contrato_id: string
          criado_em: string
          data_assinatura: string | null
          dias_delta: number
          id: string
          justificativa: string | null
          numero: string
          situacao: string
          tipo: string
          valor_delta: number
        }
        Insert: {
          atualizado_em?: string
          contrato_id: string
          criado_em?: string
          data_assinatura?: string | null
          dias_delta?: number
          id?: string
          justificativa?: string | null
          numero: string
          situacao?: string
          tipo: string
          valor_delta?: number
        }
        Update: {
          atualizado_em?: string
          contrato_id?: string
          criado_em?: string
          data_assinatura?: string | null
          dias_delta?: number
          id?: string
          justificativa?: string | null
          numero?: string
          situacao?: string
          tipo?: string
          valor_delta?: number
        }
        Relationships: [
          {
            foreignKeyName: "aditivos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aditivos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "v_contratos_resumo"
            referencedColumns: ["contrato_id"]
          },
        ]
      }
      anexos: {
        Row: {
          atualizado_em: string
          criado_em: string
          documento_id: string
          entidade: string
          id: string
          registro_id: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          documento_id: string
          entidade: string
          id?: string
          registro_id: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          documento_id?: string
          entidade?: string
          id?: string
          registro_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anexos_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_cronograma: {
        Row: {
          atualizado_em: string
          criado_em: string
          critica: boolean
          duracao_dias: number | null
          edt: string | null
          fim_previsto: string | null
          fim_real: string | null
          id: string
          inicio_previsto: string | null
          inicio_real: string | null
          marco: boolean
          nivel: number
          nome: string
          percentual: number
          resumo: boolean
          uid_project: number
          versao_id: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          critica?: boolean
          duracao_dias?: number | null
          edt?: string | null
          fim_previsto?: string | null
          fim_real?: string | null
          id?: string
          inicio_previsto?: string | null
          inicio_real?: string | null
          marco?: boolean
          nivel?: number
          nome: string
          percentual?: number
          resumo?: boolean
          uid_project: number
          versao_id: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          critica?: boolean
          duracao_dias?: number | null
          edt?: string | null
          fim_previsto?: string | null
          fim_real?: string | null
          id?: string
          inicio_previsto?: string | null
          inicio_real?: string | null
          marco?: boolean
          nivel?: number
          nome?: string
          percentual?: number
          resumo?: boolean
          uid_project?: number
          versao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_cronograma_versao_id_fkey"
            columns: ["versao_id"]
            isOneToOne: false
            referencedRelation: "cronograma_versoes"
            referencedColumns: ["id"]
          },
        ]
      }
      avanco_fisico: {
        Row: {
          atualizado_em: string
          criado_em: string
          data_referencia: string
          fonte: string
          id: string
          obra_id: string
          previsto_acum: number | null
          realizado_acum: number | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          data_referencia: string
          fonte?: string
          id?: string
          obra_id: string
          previsto_acum?: number | null
          realizado_acum?: number | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          data_referencia?: string
          fonte?: string
          id?: string
          obra_id?: string
          previsto_acum?: number | null
          realizado_acum?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "avanco_fisico_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avanco_fisico_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_obra_resumo"
            referencedColumns: ["obra_id"]
          },
        ]
      }
      conectores: {
        Row: {
          ativo: boolean
          atualizado_em: string
          configuracao: Json
          credencial_ref: string | null
          criado_em: string
          escrita_autorizada_em: string | null
          estado_conexao: string
          ferramenta: string
          id: string
          intervalo_minutos: number
          modo: string
          nome_exibicao: string
          pausado_ate: string | null
          proxima_sync_em: string | null
          ultima_sync_em: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          configuracao?: Json
          credencial_ref?: string | null
          criado_em?: string
          escrita_autorizada_em?: string | null
          estado_conexao?: string
          ferramenta: string
          id?: string
          intervalo_minutos?: number
          modo?: string
          nome_exibicao: string
          pausado_ate?: string | null
          proxima_sync_em?: string | null
          ultima_sync_em?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          configuracao?: Json
          credencial_ref?: string | null
          criado_em?: string
          escrita_autorizada_em?: string | null
          estado_conexao?: string
          ferramenta?: string
          id?: string
          intervalo_minutos?: number
          modo?: string
          nome_exibicao?: string
          pausado_ate?: string | null
          proxima_sync_em?: string | null
          ultima_sync_em?: string | null
        }
        Relationships: []
      }
      contratantes: {
        Row: {
          arquivado_em: string | null
          atualizado_em: string
          cnpj: string | null
          criado_em: string
          id: string
          nome: string
          observacoes: string | null
          orgao: string | null
          tipo: string
        }
        Insert: {
          arquivado_em?: string | null
          atualizado_em?: string
          cnpj?: string | null
          criado_em?: string
          id?: string
          nome: string
          observacoes?: string | null
          orgao?: string | null
          tipo?: string
        }
        Update: {
          arquivado_em?: string | null
          atualizado_em?: string
          cnpj?: string | null
          criado_em?: string
          id?: string
          nome?: string
          observacoes?: string | null
          orgao?: string | null
          tipo?: string
        }
        Relationships: []
      }
      contratos: {
        Row: {
          arquivado_em: string | null
          atualizado_em: string
          contratante_id: string | null
          criado_em: string
          data_assinatura: string | null
          data_base: string | null
          data_inicio: string | null
          data_termino_original: string | null
          id: string
          indice_reajuste: string | null
          modalidade: string | null
          numero: string
          objeto: string | null
          obra_id: string
          prazo_original_dias: number | null
          regime: string | null
          valor_original: number
        }
        Insert: {
          arquivado_em?: string | null
          atualizado_em?: string
          contratante_id?: string | null
          criado_em?: string
          data_assinatura?: string | null
          data_base?: string | null
          data_inicio?: string | null
          data_termino_original?: string | null
          id?: string
          indice_reajuste?: string | null
          modalidade?: string | null
          numero: string
          objeto?: string | null
          obra_id: string
          prazo_original_dias?: number | null
          regime?: string | null
          valor_original: number
        }
        Update: {
          arquivado_em?: string | null
          atualizado_em?: string
          contratante_id?: string | null
          criado_em?: string
          data_assinatura?: string | null
          data_base?: string | null
          data_inicio?: string | null
          data_termino_original?: string | null
          id?: string
          indice_reajuste?: string | null
          modalidade?: string | null
          numero?: string
          objeto?: string | null
          obra_id?: string
          prazo_original_dias?: number | null
          regime?: string | null
          valor_original?: number
        }
        Relationships: [
          {
            foreignKeyName: "contratos_contratante_id_fkey"
            columns: ["contratante_id"]
            isOneToOne: false
            referencedRelation: "contratantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_obra_resumo"
            referencedColumns: ["obra_id"]
          },
        ]
      }
      cronograma_versoes: {
        Row: {
          arquivo_origem: string | null
          atualizado_em: string
          atualizado_em_origem: string | null
          criado_em: string
          data_status: string | null
          fonte: string
          hash_conteudo: string | null
          id: string
          id_externo: string | null
          importado_em: string | null
          nome: string
          obra_id: string
          status_sync: string
          tipo: string
        }
        Insert: {
          arquivo_origem?: string | null
          atualizado_em?: string
          atualizado_em_origem?: string | null
          criado_em?: string
          data_status?: string | null
          fonte?: string
          hash_conteudo?: string | null
          id?: string
          id_externo?: string | null
          importado_em?: string | null
          nome: string
          obra_id: string
          status_sync?: string
          tipo: string
        }
        Update: {
          arquivo_origem?: string | null
          atualizado_em?: string
          atualizado_em_origem?: string | null
          criado_em?: string
          data_status?: string | null
          fonte?: string
          hash_conteudo?: string | null
          id?: string
          id_externo?: string | null
          importado_em?: string | null
          nome?: string
          obra_id?: string
          status_sync?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_versoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_versoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_obra_resumo"
            referencedColumns: ["obra_id"]
          },
        ]
      }
      decisoes: {
        Row: {
          atualizado_em: string
          atualizado_em_origem: string | null
          criado_em: string
          data_decisao: string | null
          decisao: string | null
          fonte: string
          hash_conteudo: string | null
          id: string
          id_externo: string | null
          importado_em: string | null
          obra_id: string | null
          prazo: string | null
          problema: string
          responsavel_id: string | null
          resultado: string | null
          reuniao_id: string | null
          risco_id: string | null
          status: string
          status_sync: string
        }
        Insert: {
          atualizado_em?: string
          atualizado_em_origem?: string | null
          criado_em?: string
          data_decisao?: string | null
          decisao?: string | null
          fonte?: string
          hash_conteudo?: string | null
          id?: string
          id_externo?: string | null
          importado_em?: string | null
          obra_id?: string | null
          prazo?: string | null
          problema: string
          responsavel_id?: string | null
          resultado?: string | null
          reuniao_id?: string | null
          risco_id?: string | null
          status?: string
          status_sync?: string
        }
        Update: {
          atualizado_em?: string
          atualizado_em_origem?: string | null
          criado_em?: string
          data_decisao?: string | null
          decisao?: string | null
          fonte?: string
          hash_conteudo?: string | null
          id?: string
          id_externo?: string | null
          importado_em?: string | null
          obra_id?: string | null
          prazo?: string | null
          problema?: string
          responsavel_id?: string | null
          resultado?: string | null
          reuniao_id?: string | null
          risco_id?: string | null
          status?: string
          status_sync?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_obra_resumo"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "decisoes_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisoes_reuniao_id_fkey"
            columns: ["reuniao_id"]
            isOneToOne: false
            referencedRelation: "reunioes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisoes_risco_id_fkey"
            columns: ["risco_id"]
            isOneToOne: false
            referencedRelation: "riscos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisoes_risco_id_fkey"
            columns: ["risco_id"]
            isOneToOne: false
            referencedRelation: "v_riscos_criticos"
            referencedColumns: ["id"]
          },
        ]
      }
      dependencias: {
        Row: {
          atividade_id: string
          atualizado_em: string
          criado_em: string
          defasagem_dias: number
          id: string
          predecessora_id: string
          tipo: string
        }
        Insert: {
          atividade_id: string
          atualizado_em?: string
          criado_em?: string
          defasagem_dias?: number
          id?: string
          predecessora_id: string
          tipo?: string
        }
        Update: {
          atividade_id?: string
          atualizado_em?: string
          criado_em?: string
          defasagem_dias?: number
          id?: string
          predecessora_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "dependencias_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "atividades_cronograma"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependencias_predecessora_id_fkey"
            columns: ["predecessora_id"]
            isOneToOne: false
            referencedRelation: "atividades_cronograma"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_versoes: {
        Row: {
          atualizado_em: string
          criado_em: string
          documento_id: string
          drive_revision_id: string | null
          hash_conteudo: string | null
          id: string
          modificado_em: string | null
          versao: number
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          documento_id: string
          drive_revision_id?: string | null
          hash_conteudo?: string | null
          id?: string
          modificado_em?: string | null
          versao: number
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          documento_id?: string
          drive_revision_id?: string | null
          hash_conteudo?: string | null
          id?: string
          modificado_em?: string | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "documento_versoes_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          arquivado_em: string | null
          assunto: string | null
          atualizado_em: string
          atualizado_em_origem: string | null
          busca: unknown
          caminho_local: string | null
          categoria: string
          criado_em: string
          data_documento: string | null
          drive_file_id: string | null
          fonte: string
          hash_conteudo: string | null
          id: string
          id_externo: string | null
          importado_em: string | null
          mime_type: string | null
          obra_id: string | null
          status_sync: string
          tamanho_bytes: number | null
          texto_extraido: string | null
          titulo: string
          url: string | null
        }
        Insert: {
          arquivado_em?: string | null
          assunto?: string | null
          atualizado_em?: string
          atualizado_em_origem?: string | null
          busca?: unknown
          caminho_local?: string | null
          categoria?: string
          criado_em?: string
          data_documento?: string | null
          drive_file_id?: string | null
          fonte?: string
          hash_conteudo?: string | null
          id?: string
          id_externo?: string | null
          importado_em?: string | null
          mime_type?: string | null
          obra_id?: string | null
          status_sync?: string
          tamanho_bytes?: number | null
          texto_extraido?: string | null
          titulo: string
          url?: string | null
        }
        Update: {
          arquivado_em?: string | null
          assunto?: string | null
          atualizado_em?: string
          atualizado_em_origem?: string | null
          busca?: unknown
          caminho_local?: string | null
          categoria?: string
          criado_em?: string
          data_documento?: string | null
          drive_file_id?: string | null
          fonte?: string
          hash_conteudo?: string | null
          id?: string
          id_externo?: string | null
          importado_em?: string | null
          mime_type?: string | null
          obra_id?: string | null
          status_sync?: string
          tamanho_bytes?: number | null
          texto_extraido?: string | null
          titulo?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_obra_resumo"
            referencedColumns: ["obra_id"]
          },
        ]
      }
      empresas: {
        Row: {
          arquivado_em: string | null
          atualizado_em: string
          cnpj: string | null
          criado_em: string
          id: string
          nome_fantasia: string | null
          observacoes: string | null
          razao_social: string
        }
        Insert: {
          arquivado_em?: string | null
          atualizado_em?: string
          cnpj?: string | null
          criado_em?: string
          id?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social: string
        }
        Update: {
          arquivado_em?: string | null
          atualizado_em?: string
          cnpj?: string | null
          criado_em?: string
          id?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social?: string
        }
        Relationships: []
      }
      eventos: {
        Row: {
          atualizado_em: string
          atualizado_em_origem: string | null
          calendario_externo_id: string | null
          cancelado_em: string | null
          criado_em: string
          descricao: string | null
          dia_inteiro: boolean
          fim: string | null
          fonte: string
          hash_conteudo: string | null
          ical_uid: string | null
          id: string
          id_externo: string | null
          importado_em: string | null
          inicio: string
          local: string | null
          obra_id: string | null
          status_sync: string
          tarefa_id: string | null
          titulo: string
        }
        Insert: {
          atualizado_em?: string
          atualizado_em_origem?: string | null
          calendario_externo_id?: string | null
          cancelado_em?: string | null
          criado_em?: string
          descricao?: string | null
          dia_inteiro?: boolean
          fim?: string | null
          fonte?: string
          hash_conteudo?: string | null
          ical_uid?: string | null
          id?: string
          id_externo?: string | null
          importado_em?: string | null
          inicio: string
          local?: string | null
          obra_id?: string | null
          status_sync?: string
          tarefa_id?: string | null
          titulo: string
        }
        Update: {
          atualizado_em?: string
          atualizado_em_origem?: string | null
          calendario_externo_id?: string | null
          cancelado_em?: string | null
          criado_em?: string
          descricao?: string | null
          dia_inteiro?: boolean
          fim?: string | null
          fonte?: string
          hash_conteudo?: string | null
          ical_uid?: string | null
          id?: string
          id_externo?: string | null
          importado_em?: string | null
          inicio?: string
          local?: string | null
          obra_id?: string | null
          status_sync?: string
          tarefa_id?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_obra_resumo"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "eventos_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "v_tarefas_priorizadas"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          arquivado_em: string | null
          atualizado_em: string
          avaliacao: number | null
          cnpj: string | null
          contato: string | null
          criado_em: string
          especialidade: string | null
          id: string
          nome_fantasia: string | null
          observacoes: string | null
          razao_social: string
        }
        Insert: {
          arquivado_em?: string | null
          atualizado_em?: string
          avaliacao?: number | null
          cnpj?: string | null
          contato?: string | null
          criado_em?: string
          especialidade?: string | null
          id?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social: string
        }
        Update: {
          arquivado_em?: string | null
          atualizado_em?: string
          avaliacao?: number | null
          cnpj?: string | null
          contato?: string | null
          criado_em?: string
          especialidade?: string | null
          id?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social?: string
        }
        Relationships: []
      }
      importacao_obras: {
        Row: {
          atualizado_em: string
          codigo_sugerido: string
          criado_em: string
          estrutura_padrao: boolean
          fonte: string
          id: string
          id_externo: string
          importado_em: string
          nome_sugerido: string
          obra_id: string | null
          observacao: string | null
          pasta_local: string
          pista_contratante: string | null
          provavel_nao_obra: boolean
          qtd_arquivos: number
          qtd_cronogramas: number
          qtd_pdfs: number
          qtd_planilhas: number
          revisado_em: string | null
          situacao_sugerida: string
          status: string
          subpastas: string[]
          tamanho_bytes: number
          ultima_modificacao: string | null
        }
        Insert: {
          atualizado_em?: string
          codigo_sugerido: string
          criado_em?: string
          estrutura_padrao?: boolean
          fonte?: string
          id?: string
          id_externo: string
          importado_em?: string
          nome_sugerido: string
          obra_id?: string | null
          observacao?: string | null
          pasta_local: string
          pista_contratante?: string | null
          provavel_nao_obra?: boolean
          qtd_arquivos?: number
          qtd_cronogramas?: number
          qtd_pdfs?: number
          qtd_planilhas?: number
          revisado_em?: string | null
          situacao_sugerida: string
          status?: string
          subpastas?: string[]
          tamanho_bytes?: number
          ultima_modificacao?: string | null
        }
        Update: {
          atualizado_em?: string
          codigo_sugerido?: string
          criado_em?: string
          estrutura_padrao?: boolean
          fonte?: string
          id?: string
          id_externo?: string
          importado_em?: string
          nome_sugerido?: string
          obra_id?: string | null
          observacao?: string | null
          pasta_local?: string
          pista_contratante?: string | null
          provavel_nao_obra?: boolean
          qtd_arquivos?: number
          qtd_cronogramas?: number
          qtd_pdfs?: number
          qtd_planilhas?: number
          revisado_em?: string | null
          situacao_sugerida?: string
          status?: string
          subpastas?: string[]
          tamanho_bytes?: number
          ultima_modificacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "importacao_obras_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "importacao_obras_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_obra_resumo"
            referencedColumns: ["obra_id"]
          },
        ]
      }
      indicadores_snapshot: {
        Row: {
          atualizado_em: string
          criado_em: string
          data_referencia: string
          dias_alem_do_prazo: number | null
          id: string
          obra_id: string
          pct_fisico_previsto: number | null
          pct_fisico_realizado: number | null
          valor_contratado: number | null
          valor_medido: number | null
          valor_recebido: number | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          data_referencia: string
          dias_alem_do_prazo?: number | null
          id?: string
          obra_id: string
          pct_fisico_previsto?: number | null
          pct_fisico_realizado?: number | null
          valor_contratado?: number | null
          valor_medido?: number | null
          valor_recebido?: number | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          data_referencia?: string
          dias_alem_do_prazo?: number | null
          id?: string
          obra_id?: string
          pct_fisico_previsto?: number | null
          pct_fisico_realizado?: number | null
          valor_contratado?: number | null
          valor_medido?: number | null
          valor_recebido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "indicadores_snapshot_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicadores_snapshot_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_obra_resumo"
            referencedColumns: ["obra_id"]
          },
        ]
      }
      lancamentos_financeiros: {
        Row: {
          atualizado_em: string
          contrato_id: string
          criado_em: string
          data_efetiva: string | null
          data_prevista: string | null
          id: string
          medicao_id: string | null
          nota_fiscal: string | null
          observacoes: string | null
          tipo: string
          valor: number
        }
        Insert: {
          atualizado_em?: string
          contrato_id: string
          criado_em?: string
          data_efetiva?: string | null
          data_prevista?: string | null
          id?: string
          medicao_id?: string | null
          nota_fiscal?: string | null
          observacoes?: string | null
          tipo: string
          valor: number
        }
        Update: {
          atualizado_em?: string
          contrato_id?: string
          criado_em?: string
          data_efetiva?: string | null
          data_prevista?: string | null
          id?: string
          medicao_id?: string | null
          nota_fiscal?: string | null
          observacoes?: string | null
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_financeiros_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "v_contratos_resumo"
            referencedColumns: ["contrato_id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_medicao_id_fkey"
            columns: ["medicao_id"]
            isOneToOne: false
            referencedRelation: "medicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      marcos: {
        Row: {
          atualizado_em: string
          contratual: boolean
          criado_em: string
          data_contratual: string | null
          data_prevista: string | null
          data_real: string | null
          id: string
          nome: string
          obra_id: string
        }
        Insert: {
          atualizado_em?: string
          contratual?: boolean
          criado_em?: string
          data_contratual?: string | null
          data_prevista?: string | null
          data_real?: string | null
          id?: string
          nome: string
          obra_id: string
        }
        Update: {
          atualizado_em?: string
          contratual?: boolean
          criado_em?: string
          data_contratual?: string | null
          data_prevista?: string | null
          data_real?: string | null
          id?: string
          nome?: string
          obra_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marcos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marcos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_obra_resumo"
            referencedColumns: ["obra_id"]
          },
        ]
      }
      medicoes: {
        Row: {
          atualizado_em: string
          atualizado_em_origem: string | null
          contrato_id: string
          criado_em: string
          data_aprovacao: string | null
          data_envio: string | null
          fonte: string
          hash_conteudo: string | null
          id: string
          id_externo: string | null
          importado_em: string | null
          numero: number
          percentual_fisico_acum: number | null
          periodo_fim: string
          periodo_inicio: string
          situacao: string
          status_sync: string
          valor_glosado: number
          valor_medido: number
        }
        Insert: {
          atualizado_em?: string
          atualizado_em_origem?: string | null
          contrato_id: string
          criado_em?: string
          data_aprovacao?: string | null
          data_envio?: string | null
          fonte?: string
          hash_conteudo?: string | null
          id?: string
          id_externo?: string | null
          importado_em?: string | null
          numero: number
          percentual_fisico_acum?: number | null
          periodo_fim: string
          periodo_inicio: string
          situacao?: string
          status_sync?: string
          valor_glosado?: number
          valor_medido: number
        }
        Update: {
          atualizado_em?: string
          atualizado_em_origem?: string | null
          contrato_id?: string
          criado_em?: string
          data_aprovacao?: string | null
          data_envio?: string | null
          fonte?: string
          hash_conteudo?: string | null
          id?: string
          id_externo?: string | null
          importado_em?: string | null
          numero?: number
          percentual_fisico_acum?: number | null
          periodo_fim?: string
          periodo_inicio?: string
          situacao?: string
          status_sync?: string
          valor_glosado?: number
          valor_medido?: number
        }
        Relationships: [
          {
            foreignKeyName: "medicoes_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicoes_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "v_contratos_resumo"
            referencedColumns: ["contrato_id"]
          },
        ]
      }
      obra_participantes: {
        Row: {
          atualizado_em: string
          criado_em: string
          fim: string | null
          fornecedor_id: string | null
          id: string
          inicio: string | null
          obra_id: string
          papel: string
          pessoa_id: string | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          fim?: string | null
          fornecedor_id?: string | null
          id?: string
          inicio?: string | null
          obra_id: string
          papel: string
          pessoa_id?: string | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          fim?: string | null
          fornecedor_id?: string | null
          id?: string
          inicio?: string | null
          obra_id?: string
          papel?: string
          pessoa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obra_participantes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_participantes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_participantes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_obra_resumo"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "obra_participantes_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          arquivado_em: string | null
          atualizado_em: string
          cidade: string | null
          codigo: string
          contratante_id: string | null
          criado_em: string
          data_inicio: string | null
          data_termino_prevista: string | null
          drive_folder_id: string | null
          empresa_id: string | null
          endereco: string | null
          id: string
          nome: string
          observacoes: string | null
          pasta_local: string | null
          situacao: string
          uf: string | null
        }
        Insert: {
          arquivado_em?: string | null
          atualizado_em?: string
          cidade?: string | null
          codigo: string
          contratante_id?: string | null
          criado_em?: string
          data_inicio?: string | null
          data_termino_prevista?: string | null
          drive_folder_id?: string | null
          empresa_id?: string | null
          endereco?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          pasta_local?: string | null
          situacao?: string
          uf?: string | null
        }
        Update: {
          arquivado_em?: string | null
          atualizado_em?: string
          cidade?: string | null
          codigo?: string
          contratante_id?: string | null
          criado_em?: string
          data_inicio?: string | null
          data_termino_prevista?: string | null
          drive_folder_id?: string | null
          empresa_id?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          pasta_local?: string | null
          situacao?: string
          uf?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obras_contratante_id_fkey"
            columns: ["contratante_id"]
            isOneToOne: false
            referencedRelation: "contratantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      operacoes_externas: {
        Row: {
          atualizado_em: string
          criado_em: string
          detalhe: string | null
          entidade: string
          erro: string | null
          executado_em: string | null
          ferramenta: string
          id: string
          id_externo: string
          operacao: string
          registro_id: string
          status: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          detalhe?: string | null
          entidade?: string
          erro?: string | null
          executado_em?: string | null
          ferramenta: string
          id?: string
          id_externo: string
          operacao: string
          registro_id: string
          status?: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          detalhe?: string | null
          entidade?: string
          erro?: string | null
          executado_em?: string | null
          ferramenta?: string
          id?: string
          id_externo?: string
          operacao?: string
          registro_id?: string
          status?: string
        }
        Relationships: []
      }
      pessoas: {
        Row: {
          arquivado_em: string | null
          atualizado_em: string
          criado_em: string
          eh_usuario: boolean
          email: string | null
          empresa_id: string | null
          funcao: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
        }
        Insert: {
          arquivado_em?: string | null
          atualizado_em?: string
          criado_em?: string
          eh_usuario?: boolean
          email?: string | null
          empresa_id?: string | null
          funcao?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
        }
        Update: {
          arquivado_em?: string | null
          atualizado_em?: string
          criado_em?: string
          eh_usuario?: boolean
          email?: string | null
          empresa_id?: string | null
          funcao?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      reunioes: {
        Row: {
          ata: string | null
          atualizado_em: string
          atualizado_em_origem: string | null
          criado_em: string
          data: string
          evento_id: string | null
          fonte: string
          hash_conteudo: string | null
          id: string
          id_externo: string | null
          importado_em: string | null
          obra_id: string | null
          participantes: string[] | null
          pauta: string | null
          status_sync: string
          titulo: string
        }
        Insert: {
          ata?: string | null
          atualizado_em?: string
          atualizado_em_origem?: string | null
          criado_em?: string
          data: string
          evento_id?: string | null
          fonte?: string
          hash_conteudo?: string | null
          id?: string
          id_externo?: string | null
          importado_em?: string | null
          obra_id?: string | null
          participantes?: string[] | null
          pauta?: string | null
          status_sync?: string
          titulo: string
        }
        Update: {
          ata?: string | null
          atualizado_em?: string
          atualizado_em_origem?: string | null
          criado_em?: string
          data?: string
          evento_id?: string | null
          fonte?: string
          hash_conteudo?: string | null
          id?: string
          id_externo?: string | null
          importado_em?: string | null
          obra_id?: string | null
          participantes?: string[] | null
          pauta?: string | null
          status_sync?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "reunioes_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: true
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reunioes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reunioes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_obra_resumo"
            referencedColumns: ["obra_id"]
          },
        ]
      }
      riscos: {
        Row: {
          atualizado_em: string
          categoria: string | null
          criado_em: string
          descricao: string
          id: string
          impacto: number
          obra_id: string | null
          origem: string | null
          plano_resposta: string | null
          prazo: string | null
          probabilidade: number
          responsavel_id: string | null
          severidade: number | null
          status: string
        }
        Insert: {
          atualizado_em?: string
          categoria?: string | null
          criado_em?: string
          descricao: string
          id?: string
          impacto: number
          obra_id?: string | null
          origem?: string | null
          plano_resposta?: string | null
          prazo?: string | null
          probabilidade: number
          responsavel_id?: string | null
          severidade?: number | null
          status?: string
        }
        Update: {
          atualizado_em?: string
          categoria?: string | null
          criado_em?: string
          descricao?: string
          id?: string
          impacto?: number
          obra_id?: string | null
          origem?: string | null
          plano_resposta?: string | null
          prazo?: string | null
          probabilidade?: number
          responsavel_id?: string | null
          severidade?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "riscos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riscos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_obra_resumo"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "riscos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_conflitos: {
        Row: {
          atualizado_em: string
          conector_id: string
          criado_em: string
          detectado_em: string
          entidade: string
          id: string
          id_externo: string | null
          registro_id: string
          resolucao: string | null
          resolvido_em: string | null
          valor_externo: Json
          valor_local: Json
        }
        Insert: {
          atualizado_em?: string
          conector_id: string
          criado_em?: string
          detectado_em?: string
          entidade: string
          id?: string
          id_externo?: string | null
          registro_id: string
          resolucao?: string | null
          resolvido_em?: string | null
          valor_externo: Json
          valor_local: Json
        }
        Update: {
          atualizado_em?: string
          conector_id?: string
          criado_em?: string
          detectado_em?: string
          entidade?: string
          id?: string
          id_externo?: string | null
          registro_id?: string
          resolucao?: string | null
          resolvido_em?: string | null
          valor_externo?: Json
          valor_local?: Json
        }
        Relationships: [
          {
            foreignKeyName: "sync_conflitos_conector_id_fkey"
            columns: ["conector_id"]
            isOneToOne: false
            referencedRelation: "conectores"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_execucoes: {
        Row: {
          atualizado_em: string
          atualizados: number
          conector_id: string
          conflitos: number
          criado_em: string
          criados: number
          erros: number
          finalizado_em: string | null
          gatilho: string
          id: string
          ignorados: number
          iniciado_em: string
          lidos: number
          mensagem: string | null
          status: string
        }
        Insert: {
          atualizado_em?: string
          atualizados?: number
          conector_id: string
          conflitos?: number
          criado_em?: string
          criados?: number
          erros?: number
          finalizado_em?: string | null
          gatilho: string
          id?: string
          ignorados?: number
          iniciado_em?: string
          lidos?: number
          mensagem?: string | null
          status?: string
        }
        Update: {
          atualizado_em?: string
          atualizados?: number
          conector_id?: string
          conflitos?: number
          criado_em?: string
          criados?: number
          erros?: number
          finalizado_em?: string | null
          gatilho?: string
          id?: string
          ignorados?: number
          iniciado_em?: string
          lidos?: number
          mensagem?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_execucoes_conector_id_fkey"
            columns: ["conector_id"]
            isOneToOne: false
            referencedRelation: "conectores"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_itens: {
        Row: {
          acao: string
          criado_em: string
          entidade: string
          erro: string | null
          execucao_id: string
          hash_conteudo: string | null
          id: number
          id_externo: string
          registro_id: string | null
        }
        Insert: {
          acao: string
          criado_em?: string
          entidade: string
          erro?: string | null
          execucao_id: string
          hash_conteudo?: string | null
          id?: never
          id_externo: string
          registro_id?: string | null
        }
        Update: {
          acao?: string
          criado_em?: string
          entidade?: string
          erro?: string | null
          execucao_id?: string
          hash_conteudo?: string | null
          id?: never
          id_externo?: string
          registro_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_itens_execucao_id_fkey"
            columns: ["execucao_id"]
            isOneToOne: false
            referencedRelation: "sync_execucoes"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefa_dependencias: {
        Row: {
          criado_em: string
          depende_de_id: string
          tarefa_id: string
        }
        Insert: {
          criado_em?: string
          depende_de_id: string
          tarefa_id: string
        }
        Update: {
          criado_em?: string
          depende_de_id?: string
          tarefa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_dependencias_depende_de_id_fkey"
            columns: ["depende_de_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefa_dependencias_depende_de_id_fkey"
            columns: ["depende_de_id"]
            isOneToOne: false
            referencedRelation: "v_tarefas_priorizadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefa_dependencias_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefa_dependencias_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "v_tarefas_priorizadas"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas: {
        Row: {
          aguardando_pessoa_id: string | null
          atualizado_em: string
          atualizado_em_origem: string | null
          categoria: string | null
          codigo: number
          concluida_em: string | null
          criado_em: string
          critica: boolean
          descricao: string | null
          fonte: string
          hash_conteudo: string | null
          id: string
          id_externo: string | null
          impacto: number
          importado_em: string | null
          importancia: number
          obra_id: string | null
          prazo: string | null
          responsavel_id: string | null
          status: string
          status_sync: string
          tarefa_pai_id: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          aguardando_pessoa_id?: string | null
          atualizado_em?: string
          atualizado_em_origem?: string | null
          categoria?: string | null
          codigo?: never
          concluida_em?: string | null
          criado_em?: string
          critica?: boolean
          descricao?: string | null
          fonte?: string
          hash_conteudo?: string | null
          id?: string
          id_externo?: string | null
          impacto?: number
          importado_em?: string | null
          importancia?: number
          obra_id?: string | null
          prazo?: string | null
          responsavel_id?: string | null
          status?: string
          status_sync?: string
          tarefa_pai_id?: string | null
          tipo?: string
          titulo: string
        }
        Update: {
          aguardando_pessoa_id?: string | null
          atualizado_em?: string
          atualizado_em_origem?: string | null
          categoria?: string | null
          codigo?: never
          concluida_em?: string | null
          criado_em?: string
          critica?: boolean
          descricao?: string | null
          fonte?: string
          hash_conteudo?: string | null
          id?: string
          id_externo?: string | null
          impacto?: number
          importado_em?: string | null
          importancia?: number
          obra_id?: string | null
          prazo?: string | null
          responsavel_id?: string | null
          status?: string
          status_sync?: string
          tarefa_pai_id?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_aguardando_pessoa_id_fkey"
            columns: ["aguardando_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_obra_resumo"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "tarefas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_tarefa_pai_id_fkey"
            columns: ["tarefa_pai_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_tarefa_pai_id_fkey"
            columns: ["tarefa_pai_id"]
            isOneToOne: false
            referencedRelation: "v_tarefas_priorizadas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_contratos_resumo: {
        Row: {
          contrato_id: string | null
          data_termino_original: string | null
          data_termino_vigente: string | null
          numero: string | null
          obra_id: string | null
          saldo_a_medir: number | null
          saldo_a_receber: number | null
          valor_aditivos: number | null
          valor_contratado: number | null
          valor_faturado: number | null
          valor_medido: number | null
          valor_original: number | null
          valor_recebido: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_obra_resumo"
            referencedColumns: ["obra_id"]
          },
        ]
      }
      v_obra_resumo: {
        Row: {
          codigo: string | null
          contratante_id: string | null
          data_avanco: string | null
          data_inicio: string | null
          data_termino_contratual_vigente: string | null
          data_termino_prevista: string | null
          desvio_fisico: number | null
          dias_alem_do_prazo: number | null
          empresa_id: string | null
          nome: string | null
          obra_id: string | null
          pct_financeiro: number | null
          pct_fisico_previsto: number | null
          pct_fisico_realizado: number | null
          saldo_a_medir: number | null
          situacao: string | null
          valor_contratado: number | null
          valor_faturado: number | null
          valor_medido: number | null
          valor_recebido: number | null
        }
        Relationships: [
          {
            foreignKeyName: "obras_contratante_id_fkey"
            columns: ["contratante_id"]
            isOneToOne: false
            referencedRelation: "contratantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_riscos_criticos: {
        Row: {
          atualizado_em: string | null
          categoria: string | null
          criado_em: string | null
          descricao: string | null
          id: string | null
          impacto: number | null
          obra_id: string | null
          origem: string | null
          plano_resposta: string | null
          prazo: string | null
          probabilidade: number | null
          responsavel_id: string | null
          severidade: number | null
          status: string | null
        }
        Insert: {
          atualizado_em?: string | null
          categoria?: string | null
          criado_em?: string | null
          descricao?: string | null
          id?: string | null
          impacto?: number | null
          obra_id?: string | null
          origem?: string | null
          plano_resposta?: string | null
          prazo?: string | null
          probabilidade?: number | null
          responsavel_id?: string | null
          severidade?: number | null
          status?: string | null
        }
        Update: {
          atualizado_em?: string | null
          categoria?: string | null
          criado_em?: string | null
          descricao?: string | null
          id?: string | null
          impacto?: number | null
          obra_id?: string | null
          origem?: string | null
          plano_resposta?: string | null
          prazo?: string | null
          probabilidade?: number | null
          responsavel_id?: string | null
          severidade?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "riscos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riscos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_obra_resumo"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "riscos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_tarefas_priorizadas: {
        Row: {
          aguardando_pessoa_id: string | null
          atualizado_em: string | null
          atualizado_em_origem: string | null
          categoria: string | null
          codigo: number | null
          concluida_em: string | null
          criado_em: string | null
          critica: boolean | null
          descricao: string | null
          dias_para_prazo: number | null
          escore: number | null
          fonte: string | null
          hash_conteudo: string | null
          id: string | null
          id_externo: string | null
          impacto: number | null
          importado_em: string | null
          importancia: number | null
          minha: boolean | null
          obra_id: string | null
          prazo: string | null
          responsavel_id: string | null
          status: string | null
          status_sync: string | null
          tarefa_pai_id: string | null
          tipo: string | null
          titulo: string | null
          urgencia: number | null
          vence_hoje: boolean | null
          vencida: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_aguardando_pessoa_id_fkey"
            columns: ["aguardando_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "v_obra_resumo"
            referencedColumns: ["obra_id"]
          },
          {
            foreignKeyName: "tarefas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_tarefa_pai_id_fkey"
            columns: ["tarefa_pai_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_tarefa_pai_id_fkey"
            columns: ["tarefa_pai_id"]
            isOneToOne: false
            referencedRelation: "v_tarefas_priorizadas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_vencimentos: {
        Row: {
          data: string | null
          descricao: string | null
          obra_id: string | null
          registro_id: string | null
          tipo: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      ler_credencial: { Args: { p_ferramenta: string }; Returns: string }
      ler_credencial_servico: { Args: { p_ferramenta: string }; Returns: string }
      salvar_credencial: {
        Args: { p_ferramenta: string; p_valor: string }
        Returns: undefined
      }
      aprovar_importacao_obra: {
        Args: {
          p_cidade?: string
          p_codigo: string
          p_contratante_id?: string
          p_empresa_id?: string
          p_id: string
          p_nome: string
          p_situacao: string
          p_uf?: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
