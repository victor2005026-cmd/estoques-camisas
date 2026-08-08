import type { FormEvent } from 'react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useListaCompras } from '../hooks/useListaCompras';
import { usePedidosClientes } from '../hooks/usePedidosClientes';
import { useCamisas } from '../hooks/useCamisas';
import { useToast } from '../context/ToastContext';
import { Button, Card, EmptyState, Input, Label, Select, Spinner, TextArea } from '../components/ui';
import type { Tamanho } from '../types';

const TAMANHOS: Tamanho[] = ['P', 'M', 'G', 'GG'];

export default function ListaCompras() {
  const { itens, loading, recarregar } = useListaCompras();
  const { mostrar } = useToast();

  const [item, setItem] = useState('');
  const [quantidadeDesejada, setQuantidadeDesejada] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [marcandoId, setMarcandoId] = useState<string | null>(null);
  const [quantidadeComprada, setQuantidadeComprada] = useState('');

  const aComprar = itens.filter((i) => !i.comprado);
  const jaComprado = itens.filter((i) => i.comprado);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const { error } = await supabase.from('lista_compras').insert({
      item: item.trim(),
      quantidade_desejada: quantidadeDesejada ? Number(quantidadeDesejada) : null,
      observacoes: observacoes.trim() || null,
    });
    setSalvando(false);

    if (error) {
      mostrar(error.message, 'erro');
      return;
    }

    mostrar('Adicionado à lista!', 'sucesso');
    setItem('');
    setQuantidadeDesejada('');
    setObservacoes('');
    recarregar();
  }

  function abrirMarcarComprado(id: string, sugestao: number | null) {
    setMarcandoId(id);
    setQuantidadeComprada(sugestao ? String(sugestao) : '1');
  }

  async function confirmarComprado(id: string) {
    const { error } = await supabase
      .from('lista_compras')
      .update({ comprado: true, quantidade_comprada: Number(quantidadeComprada) || 0 })
      .eq('id', id);
    if (error) {
      mostrar(error.message, 'erro');
      return;
    }
    mostrar('Marcado como comprado!', 'sucesso');
    setMarcandoId(null);
    recarregar();
  }

  async function desfazerComprado(id: string) {
    const { error } = await supabase
      .from('lista_compras')
      .update({ comprado: false, quantidade_comprada: null })
      .eq('id', id);
    if (error) {
      mostrar(error.message, 'erro');
      return;
    }
    recarregar();
  }

  async function excluir(id: string) {
    if (!confirm('Remover esse item da lista?')) return;
    const { error } = await supabase.from('lista_compras').delete().eq('id', id);
    if (error) {
      mostrar(error.message, 'erro');
      return;
    }
    recarregar();
  }

  return (
    <div>
      <Card>
        <h2 className="font-bold mb-1">Lista de compras</h2>
        <p className="text-xs text-gray-500 mb-3">
          Anote as camisas que precisam comprar ou querem lembrar de comprar.
        </p>
        <form onSubmit={handleSubmit}>
          <Label htmlFor="item">O que precisa comprar</Label>
          <Input
            id="item"
            required
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="Ex: Camisa Palmeiras Away"
          />

          <Label htmlFor="quantidade-desejada">Quantidade desejada (opcional)</Label>
          <Input
            id="quantidade-desejada"
            type="number"
            min={1}
            step={1}
            value={quantidadeDesejada}
            onChange={(e) => setQuantidadeDesejada(e.target.value)}
          />

          <Label htmlFor="observacoes">Observações (opcional)</Label>
          <TextArea
            id="observacoes"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Ex: tamanho G, conferir com o fornecedor tal"
          />

          <Button type="submit" disabled={salvando} className="w-full mt-4">
            {salvando ? 'Adicionando...' : 'Adicionar à lista'}
          </Button>
        </form>
      </Card>

      <h3 className="text-sm font-semibold text-gray-500 mt-5 mb-2">A comprar</h3>
      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : aComprar.length === 0 ? (
        <EmptyState>Nada pendente pra comprar.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2.5">
          {aComprar.map((i) =>
            marcandoId === i.id ? (
              <Card key={i.id}>
                <div className="font-bold">{i.item}</div>
                <Label htmlFor={`qtd-comprada-${i.id}`}>Quantas vocês compraram?</Label>
                <Input
                  id={`qtd-comprada-${i.id}`}
                  type="number"
                  min={0}
                  step={1}
                  value={quantidadeComprada}
                  onChange={(e) => setQuantidadeComprada(e.target.value)}
                />
                <div className="flex gap-2 mt-3">
                  <Button className="flex-1 !py-1.5 !text-xs" onClick={() => confirmarComprado(i.id)}>
                    Confirmar
                  </Button>
                  <Button variant="secondary" className="flex-1 !py-1.5 !text-xs" onClick={() => setMarcandoId(null)}>
                    Cancelar
                  </Button>
                </div>
              </Card>
            ) : (
              <div key={i.id} className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="font-bold truncate">{i.item}</div>
                    {i.quantidade_desejada != null && (
                      <div className="text-xs text-gray-500 mt-0.5">Quantidade desejada: {i.quantidade_desejada}</div>
                    )}
                    {i.observacoes && <div className="text-xs text-gray-500 mt-0.5">{i.observacoes}</div>}
                  </div>
                </div>
                <div className="flex gap-2 mt-2.5">
                  <Button
                    className="flex-1 !py-1.5 !text-xs"
                    onClick={() => abrirMarcarComprado(i.id, i.quantidade_desejada)}
                  >
                    Marcar como comprado
                  </Button>
                  <Button variant="danger" className="!px-2.5 !py-1.5 text-xs" onClick={() => excluir(i.id)}>
                    Excluir
                  </Button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      <h3 className="text-sm font-semibold text-gray-500 mt-5 mb-2">Já comprado</h3>
      {!loading && jaComprado.length === 0 ? (
        <EmptyState>Nada comprado ainda.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2.5">
          {jaComprado.map((i) => (
            <div
              key={i.id}
              className="flex justify-between items-center bg-white border border-gray-200 rounded-xl p-3 gap-2"
            >
              <div className="min-w-0">
                <div className="font-bold truncate">{i.item}</div>
                <div className="text-xs text-gray-500 mt-0.5">Comprado: {i.quantidade_comprada ?? 0} un.</div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <Button variant="secondary" className="!px-2.5 !py-1.5 text-xs" onClick={() => desfazerComprado(i.id)}>
                  Desfazer
                </Button>
                <Button variant="danger" className="!px-2.5 !py-1.5 text-xs" onClick={() => excluir(i.id)}>
                  Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <PedidosClientes />
      </div>
    </div>
  );
}

function PedidosClientes() {
  const { pedidos, loading, recarregar } = usePedidosClientes();
  const { camisas, recarregar: recarregarCamisas } = useCamisas();
  const { mostrar } = useToast();

  const [cliente, setCliente] = useState('');
  const [modelo, setModelo] = useState('');
  const [tamanho, setTamanho] = useState<Tamanho>('G');
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [atendendoId, setAtendendoId] = useState<string | null>(null);
  const [quantidadeComprada, setQuantidadeComprada] = useState('1');
  const [precoCusto, setPrecoCusto] = useState('');
  const [precoVenda, setPrecoVenda] = useState('');
  const [confirmando, setConfirmando] = useState(false);

  const pendentes = pedidos.filter((p) => !p.atendido);
  const atendidos = pedidos.filter((p) => p.atendido);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const { error } = await supabase.from('pedidos_clientes').insert({
      cliente: cliente.trim(),
      modelo: modelo.trim(),
      tamanho,
      observacoes: observacoes.trim() || null,
    });
    setSalvando(false);

    if (error) {
      mostrar(error.message, 'erro');
      return;
    }

    mostrar('Pedido anotado!', 'sucesso');
    setCliente('');
    setModelo('');
    setTamanho('G');
    setObservacoes('');
    recarregar();
  }

  function abrirAtender(p: (typeof pedidos)[number]) {
    setAtendendoId(p.id);
    setQuantidadeComprada('1');
    const existente = camisas.find(
      (c) => c.modelo.trim().toLowerCase() === p.modelo.trim().toLowerCase() && c.tamanho === p.tamanho
    );
    setPrecoCusto(existente ? String(existente.preco_custo) : '');
    setPrecoVenda(existente ? String(existente.preco_venda) : '');
  }

  async function confirmarAtendido(p: (typeof pedidos)[number]) {
    const qtd = Number(quantidadeComprada);
    if (!qtd || qtd <= 0) {
      mostrar('Informe uma quantidade válida.', 'erro');
      return;
    }
    setConfirmando(true);

    const existente = camisas.find(
      (c) => c.modelo.trim().toLowerCase() === p.modelo.trim().toLowerCase() && c.tamanho === p.tamanho
    );

    let erro = null;
    if (existente) {
      const { error } = await supabase
        .from('camisas')
        .update({ estoque: existente.estoque + qtd })
        .eq('id', existente.id);
      erro = error;
    } else {
      const { error } = await supabase.from('camisas').insert({
        modelo: p.modelo,
        tamanho: p.tamanho,
        estoque: qtd,
        preco_custo: Number(precoCusto) || 0,
        preco_venda: Number(precoVenda) || 0,
      });
      erro = error;
    }

    if (erro) {
      setConfirmando(false);
      mostrar(erro.message, 'erro');
      return;
    }

    const { error: erroPedido } = await supabase.from('pedidos_clientes').update({ atendido: true }).eq('id', p.id);
    setConfirmando(false);

    if (erroPedido) {
      mostrar(erroPedido.message, 'erro');
      return;
    }

    mostrar('Estoque atualizado! Agora é só registrar a venda pro cliente.', 'sucesso');
    setAtendendoId(null);
    recarregarCamisas();
    recarregar();
  }

  async function excluir(id: string) {
    if (!confirm('Remover esse pedido?')) return;
    const { error } = await supabase.from('pedidos_clientes').delete().eq('id', id);
    if (error) {
      mostrar(error.message, 'erro');
      return;
    }
    recarregar();
  }

  return (
    <div>
      <Card>
        <h2 className="font-bold mb-1">Pedidos de clientes</h2>
        <p className="text-xs text-gray-500 mb-3">
          Cliente quer uma camisa específica que vocês ainda não têm. Anota aqui, e quando comprar, já soma direto no
          estoque.
        </p>
        <form onSubmit={handleSubmit}>
          <Label htmlFor="pedido-cliente">Cliente</Label>
          <Input
            id="pedido-cliente"
            required
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            placeholder="Nome do cliente"
          />

          <Label htmlFor="pedido-modelo">Modelo da camisa</Label>
          <Input
            id="pedido-modelo"
            required
            value={modelo}
            onChange={(e) => setModelo(e.target.value)}
            placeholder="Ex: Corinthians Preta"
          />

          <Label htmlFor="pedido-tamanho">Tamanho</Label>
          <Select id="pedido-tamanho" value={tamanho} onChange={(e) => setTamanho(e.target.value as Tamanho)}>
            {TAMANHOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>

          <Label htmlFor="pedido-obs">Observações (opcional)</Label>
          <TextArea
            id="pedido-obs"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Ex: combinou de pagar quando chegar"
          />

          <Button type="submit" disabled={salvando} className="w-full mt-4">
            {salvando ? 'Salvando...' : 'Anotar pedido'}
          </Button>
        </form>
      </Card>

      <h3 className="text-sm font-semibold text-gray-500 mt-5 mb-2">Pedidos pendentes</h3>
      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : pendentes.length === 0 ? (
        <EmptyState>Nenhum pedido pendente.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2.5">
          {pendentes.map((p) =>
            atendendoId === p.id ? (
              <Card key={p.id}>
                <div className="font-bold">
                  {p.cliente} — {p.modelo} ({p.tamanho})
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Isso vai criar (ou somar em) a camisa no Cadastro automaticamente.
                </p>
                <Label htmlFor={`pedido-qtd-${p.id}`}>Quantidade comprada</Label>
                <Input
                  id={`pedido-qtd-${p.id}`}
                  type="number"
                  min={1}
                  step={1}
                  value={quantidadeComprada}
                  onChange={(e) => setQuantidadeComprada(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`pedido-custo-${p.id}`}>Preço de custo (R$)</Label>
                    <Input
                      id={`pedido-custo-${p.id}`}
                      type="number"
                      min={0}
                      step={0.01}
                      value={precoCusto}
                      onChange={(e) => setPrecoCusto(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`pedido-venda-${p.id}`}>Preço de venda (R$)</Label>
                    <Input
                      id={`pedido-venda-${p.id}`}
                      type="number"
                      min={0}
                      step={0.01}
                      value={precoVenda}
                      onChange={(e) => setPrecoVenda(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    className="flex-1 !py-1.5 !text-xs"
                    disabled={confirmando}
                    onClick={() => confirmarAtendido(p)}
                  >
                    {confirmando ? 'Salvando...' : 'Confirmar e adicionar ao estoque'}
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1 !py-1.5 !text-xs"
                    onClick={() => setAtendendoId(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </Card>
            ) : (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="font-bold">
                  {p.cliente} — {p.modelo} ({p.tamanho})
                </div>
                {p.observacoes && <div className="text-xs text-gray-500 mt-0.5">{p.observacoes}</div>}
                <div className="flex gap-2 mt-2.5">
                  <Button className="flex-1 !py-1.5 !text-xs" onClick={() => abrirAtender(p)}>
                    Comprei, colocar no estoque
                  </Button>
                  <Button variant="danger" className="!px-2.5 !py-1.5 text-xs" onClick={() => excluir(p.id)}>
                    Excluir
                  </Button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      <h3 className="text-sm font-semibold text-gray-500 mt-5 mb-2">Pedidos atendidos</h3>
      {!loading && atendidos.length === 0 ? (
        <EmptyState>Nenhum pedido atendido ainda.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2.5">
          {atendidos.map((p) => (
            <div
              key={p.id}
              className="flex justify-between items-center bg-white border border-gray-200 rounded-xl p-3 gap-2"
            >
              <div className="min-w-0">
                <div className="font-bold truncate">
                  {p.cliente} — {p.modelo} ({p.tamanho})
                </div>
              </div>
              <Button variant="danger" className="!px-2.5 !py-1.5 text-xs flex-shrink-0" onClick={() => excluir(p.id)}>
                Excluir
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
