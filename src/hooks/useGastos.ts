import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Gasto } from '../types';

/** Gastos gerais do negócio (fora compra de camisa) e atualização automática via Realtime. */
export function useGastos() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('gastos')
      .select('*')
      .order('data', { ascending: false })
      .order('created_at', { ascending: false });
    if (!error && data) setGastos(data as Gasto[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
    const canal = supabase
      .channel('gastos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gastos' }, () => carregar())
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [carregar]);

  return { gastos, loading, recarregar: carregar };
}
