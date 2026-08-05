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
  const [data, setData] = useState(todayISO());
  const [forma, setForma] = useState<FormaPagamento>('Pix');
  const [status, setStatus] = useState<StatusPagamento>('Pago');
  const [obs, setObs] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!camisaId && camisas.length > 0) setCamisaId(camisas[0].id);
  }, [camisas, camisaId]);

  const camisaSelecionada = camisas.find((c) => c.id === camisaId);

  useEffect(() => {
    if (!valorEditado && camisaSelecionada) {
      setValor((Number(camisaSelecionada.preco_venda) * Number(quantidade || 0)).toFixed(2));
    }
  }, [camisaSelecionada, quantidade, valorEditado]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!camisaId) {
      mostrar('Selecione uma camisa.', 'erro');
      return;
    }
    setSalvando(true);
    const { error } = await supabase.from('vendas').insert({
      cliente: cliente.trim(),
      camisa_id: camisaId,
      quantidade: Number(quantidade),
      valor_recebido: Number(valor),
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
    setCliente('');
    setQuantidade('1');
    setValor('');
    setValorEditado(false);
    setData(todayISO());
    setObs('');
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
