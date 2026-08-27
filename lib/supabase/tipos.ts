export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      curso_ufs: {
        Row: {
          curso_id: string
          uf: string
        }
        Insert: {
          curso_id: string
          uf: string
        }
        Update: {
          curso_id?: string
          uf?: string
        }
        Relationships: [
          {
            foreignKeyName: "curso_ufs_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
        ]
      }
      cursos: {
        Row: {
          ativo: boolean
          capa_url: string | null
          carga_horaria: number
          categoria: string
          created_at: string
          descricao: string
          destaque: boolean
          ementa: string
          id: string
          preco_centavos: number
          slug: string
          titulo: string
        }
        Insert: {
          ativo?: boolean
          capa_url?: string | null
          carga_horaria: number
          categoria: string
          created_at?: string
          descricao: string
          destaque?: boolean
          ementa: string
          id?: string
          preco_centavos: number
          slug: string
          titulo: string
        }
        Update: {
          ativo?: boolean
          capa_url?: string | null
          carga_horaria?: number
          categoria?: string
          created_at?: string
          descricao?: string
          destaque?: boolean
          ementa?: string
          id?: string
          preco_centavos?: number
          slug?: string
          titulo?: string
        }
        Relationships: []
      }
      fretes: {
        Row: {
          id: string
          prazo_dias: number
          uf: string
          valor_centavos: number
        }
        Insert: {
          id?: string
          prazo_dias: number
          uf: string
          valor_centavos: number
        }
        Update: {
          id?: string
          prazo_dias?: number
          uf?: string
          valor_centavos?: number
        }
        Relationships: []
      }
      internos: {
        Row: {
          cpf: string
          created_at: string
          data_nascimento: string | null
          id: string
          matricula_prisional: string
          nome: string
          parentesco: string | null
          responsavel_id: string | null
          unidade_prisional_id: string
        }
        Insert: {
          cpf: string
          created_at?: string
          data_nascimento?: string | null
          id?: string
          matricula_prisional: string
          nome: string
          parentesco?: string | null
          responsavel_id?: string | null
          unidade_prisional_id: string
        }
        Update: {
          cpf?: string
          created_at?: string
          data_nascimento?: string | null
          id?: string
          matricula_prisional?: string
          nome?: string
          parentesco?: string | null
          responsavel_id?: string | null
          unidade_prisional_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internos_unidade_prisional_id_fkey"
            columns: ["unidade_prisional_id"]
            isOneToOne: false
            referencedRelation: "unidades_prisionais"
            referencedColumns: ["id"]
          },
        ]
      }
      matricula_eventos: {
        Row: {
          autor_id: string | null
          created_at: string
          de_status: Database["public"]["Enums"]["status_matricula"] | null
          id: string
          matricula_id: string
          nota: string | null
          para_status: Database["public"]["Enums"]["status_matricula"]
        }
        Insert: {
          autor_id?: string | null
          created_at?: string
          de_status?: Database["public"]["Enums"]["status_matricula"] | null
          id?: string
          matricula_id: string
          nota?: string | null
          para_status: Database["public"]["Enums"]["status_matricula"]
        }
        Update: {
          autor_id?: string | null
          created_at?: string
          de_status?: Database["public"]["Enums"]["status_matricula"] | null
          id?: string
          matricula_id?: string
          nota?: string | null
          para_status?: Database["public"]["Enums"]["status_matricula"]
        }
        Relationships: [
          {
            foreignKeyName: "matricula_eventos_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matricula_eventos_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      matriculas: {
        Row: {
          autorizacao_url: string | null
          codigo: string
          created_at: string
          curso_id: string
          frete_centavos: number
          id: string
          interno_id: string
          preco_centavos: number
          responsavel_id: string | null
          status: Database["public"]["Enums"]["status_matricula"]
          total_centavos: number | null
          unidade_prisional_id: string
          updated_at: string
        }
        Insert: {
          autorizacao_url?: string | null
          codigo?: string
          created_at?: string
          curso_id: string
          frete_centavos: number
          id?: string
          interno_id: string
          preco_centavos: number
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["status_matricula"]
          total_centavos?: number | null
          unidade_prisional_id: string
          updated_at?: string
        }
        Update: {
          autorizacao_url?: string | null
          codigo?: string
          created_at?: string
          curso_id?: string
          frete_centavos?: number
          id?: string
          interno_id?: string
          preco_centavos?: number
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["status_matricula"]
          total_centavos?: number | null
          unidade_prisional_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matriculas_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_interno_id_fkey"
            columns: ["interno_id"]
            isOneToOne: false
            referencedRelation: "internos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_unidade_prisional_id_fkey"
            columns: ["unidade_prisional_id"]
            isOneToOne: false
            referencedRelation: "unidades_prisionais"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamento_eventos: {
        Row: {
          evento: string
          gateway: string
          gateway_ref: string
          id: string
          payload: Json | null
          processado_em: string
        }
        Insert: {
          evento: string
          gateway: string
          gateway_ref: string
          id?: string
          payload?: Json | null
          processado_em?: string
        }
        Update: {
          evento?: string
          gateway?: string
          gateway_ref?: string
          id?: string
          payload?: Json | null
          processado_em?: string
        }
        Relationships: []
      }
      pagamentos: {
        Row: {
          created_at: string
          gateway: string
          gateway_ref: string
          id: string
          matricula_id: string | null
          metodo: Database["public"]["Enums"]["metodo_pagamento"]
          pago_em: string | null
          payload: Json | null
          status: Database["public"]["Enums"]["status_pagamento"]
          valor_centavos: number
        }
        Insert: {
          created_at?: string
          gateway: string
          gateway_ref: string
          id?: string
          matricula_id?: string | null
          metodo: Database["public"]["Enums"]["metodo_pagamento"]
          pago_em?: string | null
          payload?: Json | null
          status?: Database["public"]["Enums"]["status_pagamento"]
          valor_centavos: number
        }
        Update: {
          created_at?: string
          gateway?: string
          gateway_ref?: string
          id?: string
          matricula_id?: string | null
          metodo?: Database["public"]["Enums"]["metodo_pagamento"]
          pago_em?: string | null
          payload?: Json | null
          status?: Database["public"]["Enums"]["status_pagamento"]
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_matricula_id_fkey"
            columns: ["matricula_id"]
            isOneToOne: false
            referencedRelation: "matriculas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cpf: string
          created_at: string
          email: string
          id: string
          nome: string
          role: Database["public"]["Enums"]["papel_usuario"]
          telefone: string
        }
        Insert: {
          cpf: string
          created_at?: string
          email: string
          id: string
          nome: string
          role?: Database["public"]["Enums"]["papel_usuario"]
          telefone: string
        }
        Update: {
          cpf?: string
          created_at?: string
          email?: string
          id?: string
          nome?: string
          role?: Database["public"]["Enums"]["papel_usuario"]
          telefone?: string
        }
        Relationships: []
      }
      unidades_prisionais: {
        Row: {
          ativa: boolean
          cep: string
          created_at: string
          endereco: string
          id: string
          nome: string
          responsavel_nucleo: string | null
          telefone: string | null
          uf: string
        }
        Insert: {
          ativa?: boolean
          cep: string
          created_at?: string
          endereco: string
          id?: string
          nome: string
          responsavel_nucleo?: string | null
          telefone?: string | null
          uf: string
        }
        Update: {
          ativa?: boolean
          cep?: string
          created_at?: string
          endereco?: string
          id?: string
          nome?: string
          responsavel_nucleo?: string | null
          telefone?: string | null
          uf?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      metodo_pagamento: "pix" | "boleto" | "cartao"
      papel_usuario: "responsavel" | "admin"
      status_matricula:
        | "rascunho"
        | "aguardando_pagamento"
        | "paga"
        | "material_enviado"
        | "prova_aplicada"
        | "aprovado"
        | "reprovado"
        | "certificado_emitido"
        | "cancelada"
      status_pagamento:
        | "pendente"
        | "pago"
        | "falhou"
        | "expirado"
        | "estornado"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      metodo_pagamento: ["pix", "boleto", "cartao"],
      papel_usuario: ["responsavel", "admin"],
      status_matricula: [
        "rascunho",
        "aguardando_pagamento",
        "paga",
        "material_enviado",
        "prova_aplicada",
        "aprovado",
        "reprovado",
        "certificado_emitido",
        "cancelada",
      ],
      status_pagamento: ["pendente", "pago", "falhou", "expirado", "estornado"],
    },
  },
} as const

