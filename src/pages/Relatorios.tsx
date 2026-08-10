import { useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useVendas } from '../hooks/useVendas';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, EmptyState, Input, Label, Select, Spinner, formatBRL, formatDateBR } from '../components/ui';
import type { StatusPagamento, Venda } from '../types';

const STATUS: StatusPagamento[] = ['Pago', 'Pendente', 'Parcelado'];

export default function Relatorios() {
  const { vendas, loading, recarregar } = useVendas();
  const { mostrar } = useToast();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [valorEdit, setValorEdit] = useState('');
  const [valorTotalEdit, setValorTotalEdit] = useState('');
  const [dataPrevistaEdit, setDataPrevistaEdit] = useState('');
  const [statusEdit, setStatusEdit] = useState<StatusPagamento>('Pago');

  const pendencias = useMemo(() => {
    const lista: Array<{ venda: Venda; falta: number }> = [];
    for (const v of vendas) {
      if (v.status_pagamento === 'Pendente' || v.status_pagamento === 'Parcelado') {
        const falta = Math.max(Number(v.valor_total) - Number(v.valor_recebido), 0);
        lista.push({ venda: v, falta });
      }
    }
    lista.sort((a, b) => a.venda.data.localeCompare(b.venda.data));
    return lista;
  }, [vendas]);

  function iniciarEdicao(v: Venda) {
    setEditandoId(v.id);
    setValorEdit(String(v.valor_recebido));
    setValorTotalEdit(String(v.valor_total));
    setDataPrevistaEdit(v.data_prevista_pagamento ?? '');
    setStatusEdit(v.status_pagamento);
  }

  function editarDaPendencia(v: Venda) {
    iniciarEdicao(v);
    setTimeout(() => {
      document.getElementById(`venda-linha-${v.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }

  async function salvarEdicao(id: string) {
    const { error } = await supabase
      .from('vendas')
      .update({
        valor_recebido: Number(valorEdit),
        valor_total: Number(valorTotalEdit),
        data_prevista_pagamento: dataPrevistaEdit || null,
        status_pagamento: statusEdit,
      })
      .eq('id', id);
    if (error) {
      mostrar(error.message, 'erro');
      return;
    }
    mostrar('Venda atualizada!', 'sucesso');
    setEditandoId(null);
    recarregar();
  }

  async function excluirVenda(id: string) {
    if (!confirm('Excluir essa venda? O estoque será devolvido automaticamente.')) return;
    const { error } = await supabase.from('vendas').delete().eq('id', id);
    if (error) {
      mostrar(error.message, 'erro');
      return;
    }
    mostrar('Venda excluída e estoque devolvido.', 'sucesso');
    recarregar();
  }

  async function marcarComoPago(v: Venda) {
    const { error } = await supabase
      .from('vendas')
      .update({ valor_recebido: v.valor_total, status_pagamento: 'Pago' })
      .eq('id', v.id);
    if (error) {
      mostrar(error.message, 'erro');
      return;
    }
    mostrar('Pagamento confirmado!', 'sucesso');
    recarregar();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-500 mb-2">Pagamentos pendentes / parcelados</h3>
      {pendencias.length === 0 ? (
        <EmptyState>Nenhuma pendência de pagamento.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2.5 mb-5">
          {pendencias.map(({ venda: v, falta }) => (
            <Card key={v.id}>
              <div className="font-bold flex items-center gap-2">
                {v.cliente}{' '}
                <Badge tone={v.status_pagamento === 'Pendente' ? 'danger' : 'warning'}>{v.status_pagamento}</Badge>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {v.camisa?.modelo} - {v.camisa?.tamanho} ({v.quantidade}x) · {formatDateBR(v.data)}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Falta receber: <strong>{formatBRL(falta)}</strong>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {v.data_prevista_pagamento ? (
                  <>
                    Combinado pagar em: <strong>{formatDateBR(v.data_prevista_pagamento)}</strong>
                  </>
                ) : (
                  'Sem data combinada pra pagar o restante'
                )}
              </div>
              <div className="flex gap-2 mt-2.5">
                <Button className="flex-1 !py-1.5 !text-xs" onClick={() => marcarComoPago(v)}>
                  Já pagou
                </Button>
                <Button variant="secondary" className="flex-1 !py-1.5 !text-xs" onClick={() => editarDaPendencia(v)}>
                  Editar
                </Button>
                <Button variant="danger" className="flex-1 !py-1.5 !text-xs" onClick={() => excluirVenda(v.id)}>
                  Não pagou
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <h3 className="text-sm font-semibold text-gray-500 mb-2">Histórico de vendas</h3>
      {vendas.length === 0 ? (
        <EmptyState>Nenhuma venda registrada ainda.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2.5">
          {vendas.map((v) =>
            editandoId === v.id ? (
              <Card key={v.id} id={`venda-linha-${v.id}`}>
                <div className="font-bold">{v.cliente}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {v.camisa?.modelo} - {v.camisa?.tamanho} ({v.quantidade}x) · {formatDateBR(v.data)}
                </div>

                <Label htmlFor={`status-${v.id}`}>Status do pagamento</Label>
                <Select
                  id={`status-${v.id}`}
                  value={statusEdit}
                  onChange={(e) => setStatusEdit(e.target.value as StatusPagamento)}
                >
                  {STATUS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>

                <Label htmlFor={`valor-${v.id}`}>Valor recebido (R$)</Label>
                <Input
                  id={`valor-${v.id}`}
                  type="number"
                  min={0}
                  step={0.01}
                  value={valorEdit}
                  onChange={(e) => setValorEdit(e.target.value)}
                />

                {statusEdit !== 'Pago' && (
                  <>
                    <Label htmlFor={`valor-total-${v.id}`}>Valor total combinado (R$)</Label>
                    <Input
                      id={`valor-total-${v.id}`}
                      type="number"
                      min={0}
                      step={0.01}
                      value={valorTotalEdit}
                      onChange={(e) => setValorTotalEdit(e.target.value)}
                    />

                    <Label htmlFor={`data-prevista-${v.id}`}>Data prevista de pagamento</Label>
                    <Input
                      id={`data-prevista-${v.id}`}
                      type="date"
                      value={dataPrevistaEdit}
                      onChange={(e) => setDataPrevistaEdit(e.target.value)}
                    />
                  </>
                )}

                <div className="flex gap-2 mt-3">
                  <Button className="flex-1 !py-1.5 !text-xs" onClick={() => salvarEdicao(v.id)}>
                    Salvar
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1 !py-1.5 !text-xs"
                    onClick={() => setEditandoId(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </Card>
            ) : (
              <div
                key={v.id}
                id={`venda-linha-${v.id}`}
                className="flex justify-between items-center bg-white border border-gray-200 rounded-xl p-3 gap-2"
              >
                <div className="min-w-0">
                  <div className="font-bold truncate">
                    {v.cliente} — {formatBRL(v.valor_recebido)}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                    {v.camisa?.modelo} - {v.camisa?.tamanho} ({v.quantidade}x) · {formatDateBR(v.data)} ·{' '}
                    {v.forma_pagamento} · {v.status_pagamento}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <Button variant="secondary" className="!px-2.5 !py-1.5 text-xs" onClick={() => iniciarEdicao(v)}>
                    Editar
                  </Button>
                  <Button variant="danger" className="!px-2.5 !py-1.5 text-xs" onClick={() => excluirVenda(v.id)}>
                    Excluir
                  </Button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
