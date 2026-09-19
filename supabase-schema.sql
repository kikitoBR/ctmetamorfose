-- ==============================================================================
-- SCHEMA DO BANCO DE DADOS SUPABASE - CT METAMORFOSE
-- Execute este script no SQL Editor do seu projeto no Supabase (https://supabase.com)
-- ==============================================================================

-- 1. Criação da Tabela de Leads
CREATE TABLE IF NOT EXISTS public.leads (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    nome TEXT NOT NULL,
    cpf TEXT NOT NULL,
    email TEXT,
    telefone TEXT NOT NULL,
    data_nascimento TEXT,
    modalidades JSONB DEFAULT '[]'::jsonb,
    periodo TEXT,
    status TEXT NOT NULL DEFAULT 'AGUARDANDO_PAGAMENTO',
    metodo_pagamento TEXT,
    valor NUMERIC(10, 2) DEFAULT 129.90,
    asaas_payment_id TEXT UNIQUE,
    asaas_customer_id TEXT,
    asaas_invoice_url TEXT,
    pago_em TIMESTAMPTZ,
    observacoes TEXT DEFAULT '',
    admin_responsavel TEXT DEFAULT ''
);

-- 2. Índices para Otimização de Busca e Performance
CREATE INDEX IF NOT EXISTS idx_leads_cpf ON public.leads(cpf);
CREATE INDEX IF NOT EXISTS idx_leads_telefone ON public.leads(telefone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_asaas_payment_id ON public.leads(asaas_payment_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 4. Política de Acesso para o Backend (Service Role tem acesso total irrestrito)
-- As APIs do Node/Vite usando a chave service_role ou chamadas autenticadas operam normalmente
CREATE POLICY "Permitir leitura e escrita do backend"
ON public.leads
FOR ALL
TO authenticated, anon, service_role
USING (true)
WITH CHECK (true);

-- 5. Função Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
CREATE TRIGGER trg_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Pronto! Sua tabela está criada com alta performance e índices para concorrência multi-admin.
