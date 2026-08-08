import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { PedidoCliente } from '../types';

/** Pedidos de clientes por camisas específicas (ainda sem estoque) e atualização automática via Realtime. */
export function usePedidosClientes() {
  const [pedidos, setPedidos] = useState<PedidoCliente[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('pedidos_clientes')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setPedidos(data as PedidoCliente[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
    const canal = supabase
      .channel('pedidos-clientes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_clientes' }, () => carregar())
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [carregar]);

  return { pedidos, loading, recarregar: carregar };
}
