import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCamisas } from '../hooks/useCamisas';
import { useToast } from '../context/ToastContext';
import { Button, Card, Input, Label, Select, TextArea, formatBRL, todayISO } from '../components/ui';
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
  );
}
