import type { FormEvent } from 'react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useListaCompras } from '../hooks/useListaCompras';
import { useToast } from '../context/ToastContext';
import { Button, Card, EmptyState, Input, Label, Spinner, TextArea } from '../components/ui';

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
    </div>
  );
}
