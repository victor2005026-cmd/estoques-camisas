import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCamisas } from '../hooks/useCamisas';
import { useToast } from '../context/ToastContext';
import { Button, Card, Input, Label, Select, TextArea, formatBRL, todayISO } from '../components/ui';
import type { Camisa, FormaPagamento, StatusPagamento } from '../types';

const FORMAS: FormaPagamento[] = ['Pix', 'Dinheiro', 'Cartão'];
const STATUS: StatusPagamento[] = ['Pago', 'Pendente', 'Parcelado'];

function rotuloCamisa(c: Camisa) {
  return `${c.modelo} - ${c.tamanho} (estoque: ${c.estoque})`;
}

interface ItemVenda {
  chave: string;
  camisaId: string;
  busca: string;
  quantidade: string;
  valor: string;
  valorEditado: boolean;
  valorTotal: string;
  valorTotalEditado: boolean;
}

function itemVazio(): ItemVenda {
  return {
    chave: crypto.randomUUID(),
    camisaId: '',
    busca: '',
    quantidade: '1',
    valor: '',
    valorEditado: false,
    valorTotal: '',
    valorTotalEditado: false,
  };
}

export default function Venda() {
  const { camisas, recarregar } = useCamisas();
  const { mostrar } = useToast();

  const [itens, setItens] = useState<ItemVenda[]>([itemVazio()]);
  const [cliente, setCliente] = useState('');
  const [data, setData] = useState(todayISO());
  const [forma, setForma] = useState<FormaPagamento>('Pix');
  const [status, setStatus] = useState<StatusPagamento>('Pago');
  const [dataPrevista, setDataPrevista] = useState('');
  const [obs, setObs] = useState('');
  const [salvando, setSalvando] = useState(false);

  const naoPago = status !== 'Pago';

  // Seleciona a primeira camisa disponível assim que a lista carrega, no primeiro item.
  useEffect(() => {
    if (camisas.length === 0) return;
    setItens((atual) => {
      if (atual.length !== 1 || atual[0].camisaId) return atual;
      const primeira = camisas[0];
      return [{ ...atual[0], camisaId: primeira.id, busca: rotuloCamisa(primeira) }];
    });
  }, [camisas]);

  function recalcularSugestoes(item: ItemVenda, camisa: Camisa | undefined): ItemVenda {
    const qtd = Number(item.quantidade || 0);
    const atualizado = { ...item };
    if (!item.valorEditado && camisa) {
      atualizado.valor = status === 'Pago' ? (Number(camisa.preco_venda) * qtd).toFixed(2) : '0';
    }
    if (!item.valorTotalEditado && camisa) {
      atualizado.valorTotal = (Number(camisa.preco_venda) * qtd).toFixed(2);
    }
    return atualizado;
  }

  function atualizarItem(chave: string, patch: Partial<ItemVenda>) {
    setItens((atual) =>
      atual.map((it) => {
        if (it.chave !== chave) return it;
        const combinado = { ...it, ...patch };
        const camisa = camisas.find((c) => c.id === combinado.camisaId);
        return recalcularSugestoes(combinado, camisa);
      })
    );
  }

  function selecionarCamisaPorTexto(chave: string, texto: string) {
    const encontrada = camisas.find((c) => rotuloCamisa(c) === texto);
    atualizarItem(chave, { busca: texto, camisaId: encontrada ? encontrada.id : '' });
  }

  function adicionarItem() {
    setItens((atual) => [...atual, itemVazio()]);
  }

  function removerItem(chave: string) {
    setItens((atual) => (atual.length > 1 ? atual.filter((it) => it.chave !== chave) : atual));
  }

  // Recalcula os valores sugeridos de todos os itens quando o status muda (ex: Pago -> Pendente).
  // Só deve rodar quando o status muda, por isso não inclui camisas/recalcularSugestoes nas deps.
  useEffect(() => {
    setItens((atual) => atual.map((it) => recalcularSugestoes(it, camisas.find((c) => c.id === it.camisaId))));
  }, [status]);

  function resetForm() {
    setItens([itemVazio()]);
    setCliente('');
    setData(todayISO());
    setStatus('Pago');
    setDataPrevista('');
    setObs('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!cliente.trim()) {
      mostrar('Informe o nome do cliente.', 'erro');
      return;
    }
    for (const it of itens) {
      if (!it.camisaId) {
        mostrar('Selecione uma camisa válida em todos os itens (digite pra buscar).', 'erro');
        return;
      }
    }

    setSalvando(true);

    let sucessos = 0;
    for (const it of itens) {
      const valorRecebidoNum = Number(it.valor);
      const { error } = await supabase.from('vendas').insert({
        cliente: cliente.trim(),
        camisa_id: it.camisaId,
        quantidade: Number(it.quantidade),
        valor_recebido: valorRecebidoNum,
        valor_total: naoPago ? Number(it.valorTotal) : valorRecebidoNum,
        data_prevista_pagamento: naoPago && dataPrevista ? dataPrevista : null,
        data,
        forma_pagamento: forma,
        status_pagamento: status,
        observacoes: obs.trim() || null,
      });

      if (error) {
        const extra = sucessos > 0 ? ` (${sucessos} camisa(s) já foram registradas antes desse erro)` : '';
        mostrar(`Erro ao registrar "${it.busca}": ${error.message}${extra}`, 'erro');
        setSalvando(false);
        recarregar();
        return;
      }
      sucessos++;
    }

    setSalvando(false);
    mostrar(sucessos > 1 ? `${sucessos} vendas registradas com sucesso!` : 'Venda registrada com sucesso!', 'sucesso');
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

        <div className="flex flex-col gap-4 mt-4">
          {itens.map((item, idx) => {
            const camisaSelecionada = camisas.find((c) => c.id === item.camisaId);
            return (
              <div key={item.chave} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-500">Camisa {idx + 1}</span>
                  {itens.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removerItem(item.chave)}
                      className="text-xs text-red-600 font-semibold"
                    >
                      Remover
                    </button>
                  )}
                </div>

                <Label htmlFor={`camisa-busca-${item.chave}`}>Camisa</Label>
                <Input
                  id={`camisa-busca-${item.chave}`}
                  list={`camisas-sugestoes-${item.chave}`}
                  required
                  value={item.busca}
                  onChange={(e) => selecionarCamisaPorTexto(item.chave, e.target.value)}
                  placeholder="Digite pra buscar..."
                />
                <datalist id={`camisas-sugestoes-${item.chave}`}>
                  {camisas.map((c) => (
                    <option key={c.id} value={rotuloCamisa(c)} />
                  ))}
                </datalist>
                {camisaSelecionada && (
                  <p
                    className={`text-xs mt-1 ${
                      camisaSelecionada.estoque <= 0 ? 'text-red-600 font-semibold' : 'text-gray-500'
                    }`}
                  >
                    Disponível: {camisaSelecionada.estoque} un. · Preço de venda:{' '}
                    {formatBRL(camisaSelecionada.preco_venda)}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`quantidade-${item.chave}`}>Quantidade</Label>
                    <Input
                      id={`quantidade-${item.chave}`}
                      type="number"
                      min={1}
                      step={1}
                      required
                      value={item.quantidade}
                      onChange={(e) => atualizarItem(item.chave, { quantidade: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`valor-${item.chave}`}>Valor recebido (R$)</Label>
                    <Input
                      id={`valor-${item.chave}`}
                      type="number"
                      min={0}
                      step={0.01}
                      required
                      value={item.valor}
                      onChange={(e) => atualizarItem(item.chave, { valor: e.target.value, valorEditado: true })}
                    />
                  </div>
                </div>

                {naoPago && (
                  <>
                    <Label htmlFor={`valor-total-${item.chave}`}>Valor total combinado (R$)</Label>
                    <Input
                      id={`valor-total-${item.chave}`}
                      type="number"
                      min={0}
                      step={0.01}
                      required
                      value={item.valorTotal}
                      onChange={(e) =>
                        atualizarItem(item.chave, { valorTotal: e.target.value, valorTotalEditado: true })
                      }
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>

        <Button type="button" variant="secondary" className="w-full mt-3" onClick={adicionarItem}>
          + Adicionar outra camisa nessa venda
        </Button>

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
            <p className="text-xs text-gray-500 mt-1">
              O valor combinado no total de cada item, mesmo que ainda não tenha recebido tudo. É com base nele que
              o sistema calcula quanto falta.
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

        <Button type="submit" disabled={salvando} className="w-full mt-4">
          {salvando ? 'Registrando...' : itens.length > 1 ? `Registrar ${itens.length} vendas` : 'Registrar venda'}
        </Button>
      </form>
    </Card>
  );
}
