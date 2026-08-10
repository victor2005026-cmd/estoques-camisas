import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Viagem } from '../types';

/** Viagens (ex: idas pra SP comprar camisas) e atualização automática via Realtime. */
export function useViagens() {
  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('viagens')
      .select('*')
      .order('data', { ascending: false })
      .order('created_at', { ascending: false });
    if (!error && data) setViagens(data as Viagem[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
    const canal = supabase
      .channel('viagens-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'viagens' }, () => carregar())
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [carregar]);

  return { viagens, loading, recarregar: carregar };
}
