import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/** Configurações gerais (hoje só o Total investido), editáveis, com atualização automática via Realtime. */
export function useConfiguracoes() {
  const [totalInvestido, setTotalInvestido] = useState(0);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('configuracoes').select('total_investido').eq('id', 1).single();
    if (!error && data) setTotalInvestido(Number(data.total_investido));
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
    const canal = supabase
      .channel('configuracoes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracoes' }, () => carregar())
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [carregar]);

  async function atualizarTotalInvestido(novoValor: number) {
    const { error } = await supabase.from('configuracoes').update({ total_investido: novoValor }).eq('id', 1);
    if (!error) setTotalInvestido(novoValor);
    return { error };
  }

  return { totalInvestido, loading, atualizarTotalInvestido };
}
