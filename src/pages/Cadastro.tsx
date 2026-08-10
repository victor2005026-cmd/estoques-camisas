import type { ChangeEvent, FormEvent } from 'react';
import { useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCamisas } from '../hooks/useCamisas';
import { useToast } from '../context/ToastContext';
import { comprimirImagem } from '../lib/imagem';
import { BUCKET_FOTOS, removerFotoAntiga } from '../lib/storage';
import { Button, Card, EmptyState, Input, Label, Select, Spinner, formatBRL } from '../components/ui';
import type { Camisa, Tamanho } from '../types';

const TAMANHOS: Tamanho[] = ['P', 'M', 'G', 'GG'];

const FORM_VAZIO = {
  modelo: '',
  tamanho: 'P' as Tamanho,
  estoque: '0',
  preco_venda: '',
  preco_custo: '',
  foto_url: '',
};

interface ItemCadastro {
  chave: string;
  modelo: string;
  tamanho: Tamanho;
  estoque: string;
  precoVenda: string;
  precoCusto: string;
}

function itemVazio(): ItemCadastro {
  return {
    chave: crypto.randomUUID(),
    modelo: '',
    tamanho: 'P',
    estoque: '1',
    precoVenda: '',
    precoCusto: '',
  };
}

export default function Cadastro() {
  const { camisas, loading, recarregar } = useCamisas();
  const { mostrar } = useToast();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [itens, setItens] = useState<ItemCadastro[]>([itemVazio()]);
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Guarda a foto que está de fato salva no banco pra essa camisa (pra saber o que é seguro apagar do Storage).
  const fotoSalvaRef = useRef<string>('');

  const modelosExistentes = [...new Set(camisas.map((c) => c.modelo))].sort();

  function editar(c: Camisa) {
    setEditandoId(c.id);
    fotoSalvaRef.current = c.foto_url ?? '';
    setForm({
      modelo: c.modelo,
      tamanho: c.tamanho,
      estoque: String(c.estoque),
      preco_venda: String(c.preco_venda),
      preco_custo: String(c.preco_custo),
      foto_url: c.foto_url ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setItens([itemVazio()]);
    fotoSalvaRef.current = '';
    if (fileRef.current) fileRef.current.value = '';
  }

  /** Botão "Cancelar": se uma foto nova foi enviada mas não chegou a ser salva, apaga ela do Storage. */
  function cancelar() {
    if (form.foto_url && form.foto_url !== fotoSalvaRef.current) {
      removerFotoAntiga(form.foto_url);
    }
    resetForm();
  }

  async function handleFoto(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setEnviandoFoto(true);
    try {
      const blob = await comprimirImagem(arquivo);
      const caminho = `${crypto.randomUUID()}.jpg`;
      const { error: erroUpload } = await supabase.storage
        .from(BUCKET_FOTOS)
        .upload(caminho, blob, { contentType: 'image/jpeg' });
      if (erroUpload) throw erroUpload;
      const { data } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(caminho);

      // Se já tinha uma foto recém-enviada nesse formulário (ainda não salva), descarta ela —
      // evita acumular lixo no Storage quando a pessoa troca a foto antes de salvar.
      if (form.foto_url && form.foto_url !== fotoSalvaRef.current) {
        removerFotoAntiga(form.foto_url);
      }

      setForm((f) => ({ ...f, foto_url: data.publicUrl }));
      mostrar('Foto enviada!', 'sucesso');
    } catch (err) {
      mostrar(err instanceof Error ? err.message : 'Não foi possível enviar a foto.', 'erro');
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function handleSubmitEdicao() {
    const payload = {
      modelo: form.modelo.trim(),
      tamanho: form.tamanho,
      estoque: Number(form.estoque),
      preco_venda: Number(form.preco_venda),
      preco_custo: Number(form.preco_custo),
      foto_url: form.foto_url || null,
    };

    const { error } = await supabase.from('camisas').update(payload).eq('id', editandoId!);

    if (error) {
      if (error.code === '23505') {
        mostrar('Já existe uma camisa com esse modelo e tamanho.', 'erro');
      } else {
        mostrar(error.message, 'erro');
      }
      return false;
    }
    return true;
  }

  /** Cadastro novo: permite dar entrada em várias camisas (mesmo modelo em tamanhos diferentes, ou modelos diferentes) de uma vez. */
  async function handleSubmitNovo() {
    for (const it of itens) {
      if (!it.modelo.trim()) {
        mostrar('Preencha o modelo de todas as camisas da lista.', 'erro');
        return false;
      }
    }

    let sucessos = 0;
    for (const it of itens) {
      const modelo = it.modelo.trim();
      const qtd = Number(it.estoque) || 0;
      const precoVenda = Number(it.precoVenda) || 0;
      const precoCusto = Number(it.precoCusto) || 0;

      const existente = camisas.find(
        (c) => c.modelo.trim().toLowerCase() === modelo.toLowerCase() && c.tamanho === it.tamanho
      );

      if (existente) {
        const { error } = await supabase
          .from('camisas')
          .update({ estoque: existente.estoque + qtd })
          .eq('id', existente.id);
        if (error) {
          const extra = sucessos > 0 ? ` (${sucessos} camisa(s) já foram registradas antes desse erro)` : '';
          mostrar(`Erro em "${modelo} - ${it.tamanho}": ${error.message}${extra}`, 'erro');
          return false;
        }
      } else {
        const { error } = await supabase.from('camisas').insert({
          modelo,
          tamanho: it.tamanho,
          estoque: qtd,
          preco_venda: precoVenda,
          preco_custo: precoCusto,
        });
        if (error) {
          const extra = sucessos > 0 ? ` (${sucessos} camisa(s) já foram registradas antes desse erro)` : '';
          mostrar(`Erro em "${modelo} - ${it.tamanho}": ${error.message}${extra}`, 'erro');
          return false;
        }
      }
      sucessos++;
    }
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const sucesso = editandoId ? await handleSubmitEdicao() : await handleSubmitNovo();
    setSalvando(false);

    if (!sucesso) {
      recarregar();
      return;
    }

    // Salvou com sucesso: agora sim pode apagar a foto antiga, se ela foi substituída (só se aplica na edição).
    if (editandoId && fotoSalvaRef.current && fotoSalvaRef.current !== form.foto_url) {
      removerFotoAntiga(fotoSalvaRef.current);
    }

    mostrar(
      !editandoId && itens.length > 1 ? `${itens.length} camisas salvas com sucesso!` : 'Camisa salva com sucesso!',
      'sucesso'
    );
    resetForm();
    recarregar();
  }

  function atualizarItem(chave: string, patch: Partial<ItemCadastro>) {
    setItens((atual) => atual.map((it) => (it.chave === chave ? { ...it, ...patch } : it)));
  }

  function adicionarItem() {
    setItens((atual) => [...atual, itemVazio()]);
  }

  function removerItem(chave: string) {
    setItens((atual) => (atual.length > 1 ? atual.filter((it) => it.chave !== chave) : atual));
  }

  async function excluir(c: Camisa) {
    if (!confirm(`Excluir "${c.modelo} - ${c.tamanho}"? Essa ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from('camisas').delete().eq('id', c.id);
    if (error) {
      if (error.code === '23503') {
        mostrar('Não é possível excluir: essa camisa já tem vendas registradas.', 'erro');
      } else {
        mostrar(error.message, 'erro');
      }
      return;
    }
    mostrar('Camisa excluída.', 'sucesso');
    removerFotoAntiga(c.foto_url);
    recarregar();
  }

  return (
    <div>
      <Card>
        <h2 className="font-bold mb-3">{editandoId ? 'Editando camisa' : 'Nova camisa'}</h2>
        <form onSubmit={handleSubmit}>
          {editandoId ? (
            <>
              <Label htmlFor="modelo">Modelo</Label>
              <Input
                id="modelo"
                required
                value={form.modelo}
                onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))}
                placeholder="Ex: Camisa Retrô Azul"
              />

              <Label htmlFor="tamanho">Tamanho</Label>
              <Select
                id="tamanho"
                value={form.tamanho}
                onChange={(e) => setForm((f) => ({ ...f, tamanho: e.target.value as Tamanho }))}
              >
                {TAMANHOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>

              <Label htmlFor="estoque">Estoque</Label>
              <Input
                id="estoque"
                type="number"
                min={0}
                step={1}
                required
                value={form.estoque}
                onChange={(e) => setForm((f) => ({ ...f, estoque: e.target.value }))}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="preco_venda">Preço de venda (R$)</Label>
                  <Input
                    id="preco_venda"
                    type="number"
                    min={0}
                    step={0.01}
                    required
                    value={form.preco_venda}
                    onChange={(e) => setForm((f) => ({ ...f, preco_venda: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="preco_custo">Preço de custo (R$)</Label>
                  <Input
                    id="preco_custo"
                    type="number"
                    min={0}
                    step={0.01}
                    required
                    value={form.preco_custo}
                    onChange={(e) => setForm((f) => ({ ...f, preco_custo: e.target.value }))}
                  />
                </div>
              </div>

              <Label htmlFor="foto">Foto (opcional)</Label>
              <input
                id="foto"
                type="file"
                accept="image/*"
                ref={fileRef}
                onChange={handleFoto}
                disabled={enviandoFoto}
                className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-600 file:font-semibold"
              />
              {enviandoFoto && (
                <p className="text-sm text-gray-500 mt-2 flex items-center gap-2">
                  <Spinner className="h-4 w-4 border-2" /> Enviando foto...
                </p>
              )}
              {form.foto_url && !enviandoFoto && (
                <img src={form.foto_url} alt="Prévia" className="mt-2 max-h-40 rounded-lg border border-gray-200" />
              )}
            </>
          ) : (
            <>
              <div className="flex flex-col gap-4">
                {itens.map((item, idx) => (
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

                    <Label htmlFor={`modelo-${item.chave}`}>Modelo</Label>
                    <Input
                      id={`modelo-${item.chave}`}
                      list={`modelos-sugestoes-${item.chave}`}
                      required
                      value={item.modelo}
                      onChange={(e) => atualizarItem(item.chave, { modelo: e.target.value })}
                      placeholder="Ex: Corinthians Preta"
                    />
                    <datalist id={`modelos-sugestoes-${item.chave}`}>
                      {modelosExistentes.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`tamanho-${item.chave}`}>Tamanho</Label>
                        <Select
                          id={`tamanho-${item.chave}`}
                          value={item.tamanho}
                          onChange={(e) => atualizarItem(item.chave, { tamanho: e.target.value as Tamanho })}
                        >
                          {TAMANHOS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor={`estoque-${item.chave}`}>Estoque</Label>
                        <Input
                          id={`estoque-${item.chave}`}
                          type="number"
                          min={0}
                          step={1}
                          required
                          value={item.estoque}
                          onChange={(e) => atualizarItem(item.chave, { estoque: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`preco-venda-${item.chave}`}>Preço de venda (R$)</Label>
                        <Input
                          id={`preco-venda-${item.chave}`}
                          type="number"
                          min={0}
                          step={0.01}
                          required
                          value={item.precoVenda}
                          onChange={(e) => atualizarItem(item.chave, { precoVenda: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`preco-custo-${item.chave}`}>Preço de custo (R$)</Label>
                        <Input
                          id={`preco-custo-${item.chave}`}
                          type="number"
                          min={0}
                          step={0.01}
                          required
                          value={item.precoCusto}
                          onChange={(e) => atualizarItem(item.chave, { precoCusto: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button type="button" variant="secondary" className="w-full mt-3" onClick={adicionarItem}>
                + Adicionar outra camisa nessa leva
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Se o modelo + tamanho já existir, a quantidade soma no estoque em vez de duplicar. Foto dá pra
                adicionar depois, editando cada camisa.
              </p>
            </>
          )}

          <div className="flex gap-2 mt-4">
            <Button type="submit" disabled={salvando || enviandoFoto} className="flex-1">
              {salvando
                ? 'Salvando...'
                : editandoId
                  ? 'Salvar alterações'
                  : itens.length > 1
                    ? `Salvar ${itens.length} camisas`
                    : 'Salvar camisa'}
            </Button>
            {editandoId && (
              <Button type="button" variant="secondary" onClick={cancelar}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </Card>

      <h3 className="text-sm font-semibold text-gray-500 mt-5 mb-2">Camisas cadastradas</h3>
      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : camisas.length === 0 ? (
        <EmptyState>Nenhuma camisa cadastrada ainda.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2.5">
          {camisas.map((c) => (
            <div key={c.id} className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-xl p-3">
              {c.foto_url && (
                <img
                  src={c.foto_url}
                  alt=""
                  className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold">
                  {c.modelo} - {c.tamanho}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Estoque: {c.estoque} · Venda: {formatBRL(c.preco_venda)} · Custo: {formatBRL(c.preco_custo)}
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <Button variant="secondary" className="!px-2.5 !py-1.5 text-xs" onClick={() => editar(c)}>
                  Editar
                </Button>
                <Button variant="danger" className="!px-2.5 !py-1.5 text-xs" onClick={() => excluir(c)}>
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
