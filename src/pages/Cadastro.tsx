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

const QUANTIDADES_VAZIAS: Record<Tamanho, string> = { P: '', M: '', G: '', GG: '' };

export default function Cadastro() {
  const { camisas, loading, recarregar } = useCamisas();
  const { mostrar } = useToast();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [quantidades, setQuantidades] = useState<Record<Tamanho, string>>(QUANTIDADES_VAZIAS);
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Guarda a foto que está de fato salva no banco pra essa camisa (pra saber o que é seguro apagar do Storage).
  const fotoSalvaRef = useRef<string>('');

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
    setQuantidades(QUANTIDADES_VAZIAS);
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

  /** Cadastro novo: permite dar entrada em vários tamanhos da mesma camisa numa única vez. */
  async function handleSubmitNovo() {
    const modelo = form.modelo.trim();
    const precoVenda = Number(form.preco_venda);
    const precoCusto = Number(form.preco_custo);
    const fotoUrl = form.foto_url || null;

    const entradas = TAMANHOS.map((t) => ({ tamanho: t, qtd: Number(quantidades[t]) || 0 })).filter(
      (e) => e.qtd > 0
    );

    if (entradas.length === 0) {
      mostrar('Informe a quantidade de pelo menos um tamanho.', 'erro');
      return false;
    }

    for (const { tamanho, qtd } of entradas) {
      const existente = camisas.find(
        (c) => c.modelo.trim().toLowerCase() === modelo.toLowerCase() && c.tamanho === tamanho
      );

      if (existente) {
        const { error } = await supabase
          .from('camisas')
          .update({ estoque: existente.estoque + qtd })
          .eq('id', existente.id);
        if (error) {
          mostrar(`Erro no tamanho ${tamanho}: ${error.message}`, 'erro');
          return false;
        }
      } else {
        const { error } = await supabase.from('camisas').insert({
          modelo,
          tamanho,
          estoque: qtd,
          preco_venda: precoVenda,
          preco_custo: precoCusto,
          foto_url: fotoUrl,
        });
        if (error) {
          mostrar(`Erro no tamanho ${tamanho}: ${error.message}`, 'erro');
          return false;
        }
      }
    }
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const sucesso = editandoId ? await handleSubmitEdicao() : await handleSubmitNovo();
    setSalvando(false);

    if (!sucesso) return;

    // Salvou com sucesso: agora sim pode apagar a foto antiga, se ela foi substituída (só se aplica na edição).
    if (editandoId && fotoSalvaRef.current && fotoSalvaRef.current !== form.foto_url) {
      removerFotoAntiga(fotoSalvaRef.current);
    }

    mostrar('Camisa salva com sucesso!', 'sucesso');
    resetForm();
    recarregar();
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
          <Label htmlFor="modelo">Modelo</Label>
          <Input
            id="modelo"
            required
            value={form.modelo}
            onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))}
            placeholder="Ex: Camisa Retrô Azul"
          />

          {editandoId ? (
            <>
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
            </>
          ) : (
            <>
              <Label>Quantidade por tamanho</Label>
              <p className="text-xs text-gray-500 mb-1">
                Preencha só os tamanhos que comprou. Ex: 1 no G e 1 no GG registra os dois de uma vez.
              </p>
              <div className="grid grid-cols-4 gap-2">
                {TAMANHOS.map((t) => (
                  <div key={t}>
                    <Label htmlFor={`qtd-${t}`} className="text-center">
                      {t}
                    </Label>
                    <Input
                      id={`qtd-${t}`}
                      type="number"
                      min={0}
                      step={1}
                      value={quantidades[t]}
                      onChange={(e) => setQuantidades((q) => ({ ...q, [t]: e.target.value }))}
                      className="text-center"
                    />
                  </div>
                ))}
              </div>
            </>
          )}

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

          <div className="flex gap-2 mt-4">
            <Button type="submit" disabled={salvando || enviandoFoto} className="flex-1">
              {salvando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Salvar camisa'}
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
