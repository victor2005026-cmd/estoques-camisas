import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Camisa } from '../types';

/** Lista de camisas com atualização automática via Supabase Realtime (some o refresh manual entre você e seu amigo). */
export function useCamisas() {
  const [camisas, setCamisas] = useState<Camisa[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('camisas')
      .select('*')
      .order('modelo', { ascending: true })
      .order('tamanho', { ascending: true });
    if (!error && data) setCamisas(data as Camisa[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
    const canal = supabase
      .channel('camisas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'camisas' }, () => carregar())
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [carregar]);

  return { camisas, loading, recarregar: carregar };
}
