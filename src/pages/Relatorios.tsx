import { useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useVendas } from '../hooks/useVendas';
import { useCamisas } from '../hooks/useCamisas';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, EmptyState, Input, Label, Select, Spinner, formatBRL, formatDateBR } from '../components/ui';
import type { StatusPagamento, Venda } from '../types';

const STATUS: StatusPagamento[] = ['Pago', 'Pendente', 'Parcelado'];

export default function Relatorios() {
  const { vendas, loading, recarregar } = useVendas();
  const { camisas, loading: carregandoCamisas } = useCamisas();
  const { mostrar } = useToast();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [valorEdit, setValorEdit] = useState('');
  const [valorTotalEdit, setValorTotalEdit] = useState('');
  const [dataPrevistaEdit, setDataPrevistaEdit] = useState('');
  const [statusEdit, setStatusEdit] = useState<StatusPagamento>('Pago');

  const relatorio = useMemo(() => {
    let totalVendido = 0;
    let totalQuantidade = 0;
    let lucroTotal = 0;
    const pendencias: Array<{ venda: Venda; falta: number }> = [];

    for (const v of vendas) {
      const custo = Number(v.camisa?.preco_custo ?? 0);
      totalVendido += Number(v.valor_recebido);
      totalQuantidade += v.quantidade;
      lucroTotal += Number(v.valor_recebido) - custo * v.quantidade;

      if (v.status_pagamento === 'Pendente' || v.status_pagamento === 'Parcelado') {
        const falta = Math.max(Number(v.valor_total) - Number(v.valor_recebido), 0);
        pendencias.push({ venda: v, falta });
      }
    }

    pendencias.sort((a, b) => a.venda.data.localeCompare(b.venda.data));

    // Total investido = custo de tudo que ainda está em estoque + custo de tudo que já foi vendido.
    // Ou seja: quanto já foi gasto comprando as camisas, sem depender de valor de venda nenhum.
    const custoEstoqueAtual = camisas.reduce((soma, c) => soma + Number(c.preco_custo) * c.estoque, 0);
    const custoJaVendido = vendas.reduce((soma, v) => soma + Number(v.camisa?.preco_custo ?? 0) * v.quantidade, 0);
    const totalInvestido = custoEstoqueAtual + custoJaVendido;
    const margem = totalVendido - totalInvestido;

    return {
      totalVendido,
      totalQuantidade,
      lucroTotal,
      pendencias,
      numeroVendas: vendas.length,
      totalInvestido,
      margem,
    };
  }, [vendas, camisas]);

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

  if (loading || carregandoCamisas) {
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
        <Stat label="Lucro total" value={formatBRL(relatorio.lucroTotal)} tone="verde" />
        <Stat label="Vendas registradas" value={String(relatorio.numeroVendas)} />
        <Stat label="Total investido em camisas" value={formatBRL(relatorio.totalInvestido)} />
        <Stat
          label={relatorio.margem >= 0 ? 'Margem (já positivo!)' : 'Margem (ainda no negativo)'}
          value={formatBRL(relatorio.margem)}
          tone={relatorio.margem >= 0 ? 'verde' : 'vermelho'}
        />
      </div>

      <h3 className="text-sm font-semibold text-gray-500 mb-2">Pagamentos pendentes / parcelados</h3>
      {relatorio.pendencias.length === 0 ? (
        <EmptyState>Nenhuma pendência de pagamento.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2.5 mb-5">
          {relatorio.pendencias.map(({ venda: v, falta }) => (
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

type StatTone = 'azul' | 'verde' | 'vermelho';

function Stat({ label, value, tone = 'azul' }: { label: string; value: string; tone?: StatTone }) {
  const cores: Record<StatTone, string> = {
    azul: 'text-brand-500',
    verde: 'text-green-600',
    vermelho: 'text-red-600',
  };
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3.5 text-center">
      <div className={`text-lg font-extrabold ${cores[tone]}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
