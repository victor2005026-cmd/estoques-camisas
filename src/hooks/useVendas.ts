import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Venda } from '../types';

/** Histórico de vendas (com a camisa relacionada) e atualização automática via Realtime. */
export function useVendas() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('vendas')
      .select('*, camisa:camisas(*)')
      .order('data', { ascending: false })
      .order('created_at', { ascending: false });
    if (!error && data) setVendas(data as unknown as Venda[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
    const canal = supabase
      .channel('vendas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, () => carregar())
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [carregar]);

  return { vendas, loading, recarregar: carregar };
}
