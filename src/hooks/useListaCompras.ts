import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { ItemCompra } from '../types';

/** Lista de camisas a comprar (com o que já foi comprado) e atualização automática via Realtime. */
export function useListaCompras() {
  const [itens, setItens] = useState<ItemCompra[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('lista_compras')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setItens(data as ItemCompra[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
    const canal = supabase
      .channel('lista-compras-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lista_compras' }, () => carregar())
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [carregar]);

  return { itens, loading, recarregar: carregar };
}
