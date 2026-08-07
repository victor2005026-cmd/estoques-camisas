import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCamisas } from '../hooks/useCamisas';
import { useGastos } from '../hooks/useGastos';
import { useToast } from '../context/ToastContext';
import { Button, Card, EmptyState, Input, Label, Select, TextArea, formatBRL, formatDateBR, todayISO } from '../components/ui';
import type { FormaPagamento, StatusPagamento } from '../types';

const FORMAS: FormaPagamento[] = ['Pix', 'Dinheiro', 'Cartão'];
const STATUS: StatusPagamento[] = ['Pago', 'Pendente', 'Parcelado'];

export default function Venda() {
  const { camisas, recarregar } = useCamisas();
  const { mostrar } = useToast();

  const [camisaId, setCamisaId] = useState('');
  const [cliente, setCliente] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [valor, setValor] = useState('');
  const [valorEditado, setValorEditado] = useState(false);
  const [valorTotal, setValorTotal] = useState('');
  const [valorTotalEditado, setValorTotalEditado] = useState(false);
  const [dataPrevista, setDataPrevista] = useState('');
  const [data, setData] = useState(todayISO());
  const [forma, setForma] = useState<FormaPagamento>('Pix');
  const [status, setStatus] = useState<StatusPagamento>('Pago');
  const [obs, setObs] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!camisaId && camisas.length > 0) setCamisaId(camisas[0].id);
  }, [camisas, camisaId]);

  const camisaSelecionada = camisas.find((c) => c.id === camisaId);
  const naoPago = status !== 'Pago';

  // Sugere o valor recebido: preço cheio quando é venda paga na hora, ou 0 quando fica pendente/parcelada.
  useEffect(() => {
    if (valorEditado || !camisaSelecionada) return;
    if (status === 'Pago') {
      setValor((Number(camisaSelecionada.preco_venda) * Number(quantidade || 0)).toFixed(2));
    } else {
      setValor('0');
    }
  }, [camisaSelecionada, quantidade, valorEditado, status]);

  // Sugere o valor total combinado da venda (usado só quando não é Pago).
  useEffect(() => {
    if (!valorTotalEditado && camisaSelecionada) {
      setValorTotal((Number(camisaSelecionada.preco_venda) * Number(quantidade || 0)).toFixed(2));
    }
  }, [camisaSelecionada, quantidade, valorTotalEditado]);

  function resetForm() {
    setCliente('');
    setQuantidade('1');
    setValor('');
    setValorEditado(false);
    setValorTotal('');
    setValorTotalEditado(false);
    setDataPrevista('');
    setData(todayISO());
    setStatus('Pago');
    setObs('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!camisaId) {
      mostrar('Selecione uma camisa.', 'erro');
      return;
    }
    setSalvando(true);
    const valorRecebidoNum = Number(valor);
    const { error } = await supabase.from('vendas').insert({
      cliente: cliente.trim(),
      camisa_id: camisaId,
      quantidade: Number(quantidade),
      valor_recebido: valorRecebidoNum,
      valor_total: naoPago ? Number(valorTotal) : valorRecebidoNum,
      data_prevista_pagamento: naoPago && dataPrevista ? dataPrevista : null,
      data,
      forma_pagamento: forma,
      status_pagamento: status,
      observacoes: obs.trim() || null,
    });
    setSalvando(false);

    if (error) {
      mostrar(error.message, 'erro');
      return;
    }

    mostrar('Venda registrada com sucesso!', 'sucesso');
    resetForm();
    recarregar();
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <h2 className="font-bold mb-3">Registrar venda</h2>
        <form onSubmit={handleSubmit}>
          <Label htmlFor="cliente">Cliente</Label>
          <Input
            id="cliente"
            required
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            placeholder="Nome do cliente"
          />

          <Label htmlFor="camisa">Camisa</Label>
          <Select id="camisa" required value={camisaId} onChange={(e) => setCamisaId(e.target.value)}>
            {camisas.length === 0 && <option value="">Nenhuma camisa cadastrada</option>}
            {camisas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.modelo} - {c.tamanho} (estoque: {c.estoque})
              </option>
            ))}
          </Select>
          {camisaSelecionada && (
            <p className={`text-xs mt-1 ${camisaSelecionada.estoque <= 0 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
              Disponível: {camisaSelecionada.estoque} un. · Preço de venda: {formatBRL(camisaSelecionada.preco_venda)}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="quantidade">Quantidade</Label>
              <Input
                id="quantidade"
                type="number"
                min={1}
                step={1}
                required
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="valor">Valor recebido (R$)</Label>
              <Input
                id="valor"
                type="number"
                min={0}
                step={0.01}
                required
                value={valor}
                onChange={(e) => {
                  setValor(e.target.value);
                  setValorEditado(true);
                }}
              />
            </div>
          </div>

          <Label htmlFor="data">Data</Label>
          <Input id="data" type="date" required value={data} onChange={(e) => setData(e.target.value)} />

          <Label htmlFor="forma">Forma de pagamento</Label>
          <Select id="forma" value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
            {FORMAS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Select>

          <Label htmlFor="status">Status do pagamento</Label>
          <Select id="status" value={status} onChange={(e) => setStatus(e.target.value as StatusPagamento)}>
            {STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>

          {naoPago && (
            <>
              <Label htmlFor="valor-total">Valor total combinado (R$)</Label>
              <Input
                id="valor-total"
                type="number"
                min={0}
                step={0.01}
                required
                value={valorTotal}
                onChange={(e) => {
                  setValorTotal(e.target.value);
                  setValorTotalEditado(true);
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                O valor combinado no total, mesmo que ainda não tenha recebido tudo. É com base nele que o sistema
                calcula quanto falta.
              </p>

              <Label htmlFor="data-prevista">Data prevista de pagamento (opcional)</Label>
              <Input
                id="data-prevista"
                type="date"
                value={dataPrevista}
                onChange={(e) => setDataPrevista(e.target.value)}
              />
            </>
          )}

          <Label htmlFor="obs">Observações (opcional)</Label>
          <TextArea
            id="obs"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Ex: combinou de pagar o restante sexta-feira"
          />

          <Button type="submit" disabled={salvando || !camisaId} className="w-full mt-4">
            {salvando ? 'Registrando...' : 'Registrar venda'}
          </Button>
        </form>
      </Card>

      <RegistrarGasto />
    </div>
  );
}

function RegistrarGasto() {
  const { gastos, loading, recarregar } = useGastos();
  const { mostrar } = useToast();

  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(todayISO());
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const { error } = await supabase.from('gastos').insert({
      descricao: descricao.trim(),
      valor: Number(valor),
      data,
    });
    setSalvando(false);

    if (error) {
      mostrar(error.message, 'erro');
      return;
    }

    mostrar('Gasto registrado!', 'sucesso');
    setDescricao('');
    setValor('');
    setData(todayISO());
    recarregar();
  }

  async function excluir(id: string) {
    if (!confirm('Excluir esse gasto?')) return;
    const { error } = await supabase.from('gastos').delete().eq('id', id);
    if (error) {
      mostrar(error.message, 'erro');
      return;
    }
    mostrar('Gasto excluído.', 'sucesso');
    recarregar();
  }

  return (
    <div>
      <Card>
        <h2 className="font-bold mb-1">Registrar gasto</h2>
        <p className="text-xs text-gray-500 mb-3">
          Despesas que não são compra de camisa — gasolina, pedágio, embalagem etc. Isso desconta do lucro líquido
          nos Relatórios.
        </p>
        <form onSubmit={handleSubmit}>
          <Label htmlFor="gasto-descricao">Descrição</Label>
          <Input
            id="gasto-descricao"
            required
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex: Gasolina indo pra SP"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="gasto-valor">Valor (R$)</Label>
              <Input
                id="gasto-valor"
                type="number"
                min={0}
                step={0.01}
                required
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="gasto-data">Data</Label>
              <Input id="gasto-data" type="date" required value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>

          <Button type="submit" disabled={salvando} className="w-full mt-4">
            {salvando ? 'Registrando...' : 'Registrar gasto'}
          </Button>
        </form>
      </Card>

      {!loading && gastos.length > 0 && (
        <div className="flex flex-col gap-2.5 mt-3">
          {gastos.slice(0, 10).map((g) => (
            <div
              key={g.id}
              className="flex justify-between items-center bg-white border border-gray-200 rounded-xl p-3 gap-2"
            >
              <div className="min-w-0">
                <div className="font-bold truncate">{g.descricao}</div>
                <div className="text-xs text-gray-500 mt-0.5">{formatDateBR(g.data)}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="font-bold text-red-600">-{formatBRL(g.valor)}</div>
                <Button variant="danger" className="!px-2.5 !py-1.5 text-xs" onClick={() => excluir(g.id)}>
                  Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && gastos.length === 0 && (
        <div className="mt-3">
          <EmptyState>Nenhum gasto registrado ainda.</EmptyState>
        </div>
      )}
    </div>
  );
}
