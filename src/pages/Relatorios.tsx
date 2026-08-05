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
  const [statusEdit, setStatusEdit] = useState<StatusPagamento>('Pago');

  const relatorio = useMemo(() => {
    let totalVendido = 0;
    let totalQuantidade = 0;
    let lucroTotal = 0;
    const porClienteMap = new Map<
      string,
      { cliente: string; totalPago: number; quantidadeItens: number; numeroVendas: number }
    >();
    const pendencias: Array<{ venda: Venda; falta: number; valorEsperado: number }> = [];

    for (const v of vendas) {
      const custo = Number(v.camisa?.preco_custo ?? 0);
      const preco = Number(v.camisa?.preco_venda ?? 0);
      totalVendido += Number(v.valor_recebido);
      totalQuantidade += v.quantidade;
      lucroTotal += Number(v.valor_recebido) - custo * v.quantidade;

      const atual = porClienteMap.get(v.cliente) ?? {
        cliente: v.cliente,
        totalPago: 0,
        quantidadeItens: 0,
        numeroVendas: 0,
      };
      atual.totalPago += Number(v.valor_recebido);
      atual.quantidadeItens += v.quantidade;
      atual.numeroVendas += 1;
      porClienteMap.set(v.cliente, atual);

      if (v.status_pagamento === 'Pendente' || v.status_pagamento === 'Parcelado') {
        const valorEsperado = preco * v.quantidade;
        pendencias.push({ venda: v, falta: Math.max(valorEsperado - Number(v.valor_recebido), 0), valorEsperado });
      }
    }

    const porCliente = [...porClienteMap.values()].sort((a, b) => b.totalPago - a.totalPago);
    pendencias.sort((a, b) => a.venda.data.localeCompare(b.venda.data));

    return { totalVendido, totalQuantidade, lucroTotal, porCliente, pendencias, numeroVendas: vendas.length };
  }, [vendas]);

  function iniciarEdicao(v: Venda) {
    setEditandoId(v.id);
    setValorEdit(String(v.valor_recebido));
    setStatusEdit(v.status_pagamento);
  }

  async function salvarEdicao(id: string) {
    const { error } = await supabase
      .from('vendas')
      .update({ valor_recebido: Number(valorEdit), status_pagamento: statusEdit })
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

  async function marcarComoPago(v: Venda, valorEsperado: number) {
    const { error } = await supabase
      .from('vendas')
      .update({ valor_recebido: valorEsperado, status_pagamento: 'Pago' })
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
      <div className="grid grid-cols-2 gap-2.5 my-3">
        <Stat label="Total vendido" value={formatBRL(relatorio.totalVendido)} />
        <Stat label="Camisas vendidas" value={String(relatorio.totalQuantidade)} />
        <Stat label="Lucro total" value={formatBRL(relatorio.lucroTotal)} highlight />
        <Stat label="Vendas registradas" value={String(relatorio.numeroVendas)} />
      </div>

      <h3 className="text-sm font-semibold text-gray-500 mb-2">Vendas por cliente</h3>
      {relatorio.porCliente.length === 0 ? (
        <EmptyState>Nenhuma venda registrada ainda.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2.5 mb-5">
          {relatorio.porCliente.map((c) => (
            <div
              key={c.cliente}
              className="flex justify-between items-center bg-white border border-gray-200 rounded-xl p-3"
            >
              <div>
                <div className="font-bold">{c.cliente}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {c.numeroVendas} venda(s) · {c.quantidadeItens} camisa(s)
                </div>
              </div>
              <div className="font-bold">{formatBRL(c.totalPago)}</div>
            </div>
          ))}
        </div>
      )}

      <h3 className="text-sm font-semibold text-gray-500 mb-2">Pagamentos pendentes / parcelados</h3>
      {relatorio.pendencias.length === 0 ? (
        <EmptyState>Nenhuma pendência de pagamento.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2.5 mb-5">
          {relatorio.pendencias.map(({ venda: v, falta, valorEsperado }) => (
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
              <div className="flex gap-2 mt-2.5">
                <Button className="flex-1 !py-1.5 !text-xs" onClick={() => marcarComoPago(v, valorEsperado)}>
                  Já pagou
                </Button>
                <Button variant="danger" className="flex-1 !py-1.5 !text-xs" onClick={() => excluirVenda(v.id)}>
                  Não pagou
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <h3 className="text-sm font-semibold text-gray-500 mb-2">Vendas recentes</h3>
      {vendas.length === 0 ? (
        <EmptyState>Nenhuma venda registrada ainda.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2.5">
          {vendas.slice(0, 30).map((v) =>
            editandoId === v.id ? (
              <Card key={v.id}>
                <div className="font-bold">{v.cliente}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {v.camisa?.modelo} - {v.camisa?.tamanho} ({v.quantidade}x) · {formatDateBR(v.data)}
                </div>
                <Label htmlFor={`valor-${v.id}`}>Valor recebido (R$)</Label>
                <Input
                  id={`valor-${v.id}`}
                  type="number"
                  min={0}
                  step={0.01}
                  value={valorEdit}
                  onChange={(e) => setValorEdit(e.target.value)}
                />
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

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3.5 text-center">
      <div className={`text-lg font-extrabold ${highlight ? 'text-green-600' : 'text-brand-500'}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
