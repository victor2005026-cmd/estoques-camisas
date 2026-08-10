import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useVendas } from '../hooks/useVendas';
import { useGastos } from '../hooks/useGastos';
import { useViagens } from '../hooks/useViagens';
import { useConfiguracoes } from '../hooks/useConfiguracoes';
import { useToast } from '../context/ToastContext';
import { Button, Card, EmptyState, Input, Label, Spinner, formatBRL, formatDateBR, todayISO } from '../components/ui';

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

export default function Financeiro() {
  const { vendas, loading: carregandoVendas } = useVendas();
  const { gastos, loading: carregandoGastos, recarregar: recarregarGastos } = useGastos();
  const { viagens, loading: carregandoViagens, recarregar: recarregarViagens } = useViagens();
  const { totalInvestido, loading: carregandoConfig, atualizarTotalInvestido } = useConfiguracoes();
  const { mostrar } = useToast();

  const resumo = useMemo(() => {
    let totalVendido = 0;
    let totalQuantidade = 0;
    let lucroBruto = 0;
    for (const v of vendas) {
      const custo = Number(v.camisa?.preco_custo ?? 0);
      totalVendido += Number(v.valor_recebido);
      totalQuantidade += v.quantidade;
      lucroBruto += Number(v.valor_recebido) - custo * v.quantidade;
    }

    const totalGastosAvulsos = gastos.reduce((soma, g) => soma + Number(g.valor), 0);
    const totalViagens = viagens.reduce((soma, v) => soma + Number(v.valor_total), 0);
    const totalGastos = totalGastosAvulsos + totalViagens;
    const lucroLiquido = lucroBruto - totalGastos;
    const margem = totalVendido - totalInvestido - totalGastos;

    return { totalVendido, totalQuantidade, lucroBruto, totalGastos, lucroLiquido, margem, numeroVendas: vendas.length };
  }, [vendas, gastos, viagens, totalInvestido]);

  const [editandoInvestido, setEditandoInvestido] = useState(false);
  const [totalInvestidoEdit, setTotalInvestidoEdit] = useState('');

  function abrirEdicaoInvestido() {
    setTotalInvestidoEdit(String(totalInvestido));
    setEditandoInvestido(true);
  }

  async function salvarTotalInvestido() {
    const { error } = await atualizarTotalInvestido(Number(totalInvestidoEdit) || 0);
    if (error) {
      mostrar(error.message, 'erro');
      return;
    }
    mostrar('Total investido atualizado!', 'sucesso');
    setEditandoInvestido(false);
  }

  if (carregandoVendas || carregandoGastos || carregandoViagens || carregandoConfig) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5 my-3">
        <Stat label="Total vendido" value={formatBRL(resumo.totalVendido)} />
        <Stat label="Camisas vendidas" value={String(resumo.totalQuantidade)} />
        <Stat label="Lucro bruto" value={formatBRL(resumo.lucroBruto)} tone="verde" />
        <Stat label="Vendas registradas" value={String(resumo.numeroVendas)} />
        <Stat label="Total de gastos" value={formatBRL(resumo.totalGastos)} tone="vermelho" />
        <Stat
          label="Lucro líquido"
          value={formatBRL(resumo.lucroLiquido)}
          tone={resumo.lucroLiquido >= 0 ? 'verde' : 'vermelho'}
        />
        <Stat label="Total investido em camisas" value={formatBRL(totalInvestido)} />
        <Stat
          label={resumo.margem >= 0 ? 'Margem (já positivo!)' : 'Margem (ainda no negativo)'}
          value={formatBRL(resumo.margem)}
          tone={resumo.margem >= 0 ? 'verde' : 'vermelho'}
        />
      </div>

      {editandoInvestido ? (
        <Card className="mb-5">
          <Label htmlFor="total-investido-edit">Total investido em camisas (R$)</Label>
          <Input
            id="total-investido-edit"
            type="number"
            min={0}
            step={0.01}
            value={totalInvestidoEdit}
            onChange={(e) => setTotalInvestidoEdit(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Some aqui o que gastarem comprando mais camisas, pra Margem continuar batendo certo.
          </p>
          <div className="flex gap-2 mt-3">
            <Button className="flex-1 !py-1.5 !text-xs" onClick={salvarTotalInvestido}>
              Salvar
            </Button>
            <Button variant="secondary" className="flex-1 !py-1.5 !text-xs" onClick={() => setEditandoInvestido(false)}>
              Cancelar
            </Button>
          </div>
        </Card>
      ) : (
        <button type="button" onClick={abrirEdicaoInvestido} className="text-xs text-brand-600 underline mb-5 block">
          Editar total investido em camisas
        </button>
      )}

      <RegistrarGasto gastos={gastos} recarregar={recarregarGastos} />
      <div className="mt-6">
        <Viagens viagens={viagens} recarregar={recarregarViagens} />
      </div>
    </div>
  );
}

function RegistrarGasto({
  gastos,
  recarregar,
}: {
  gastos: ReturnType<typeof useGastos>['gastos'];
  recarregar: () => void;
}) {
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
          Despesas que não são compra de camisa — embalagem, etc. Isso desconta do lucro líquido acima.
        </p>
        <form onSubmit={handleSubmit}>
          <Label htmlFor="gasto-descricao">Descrição</Label>
          <Input
            id="gasto-descricao"
            required
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex: Embalagem"
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

      {gastos.length > 0 ? (
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
      ) : (
        <div className="mt-3">
          <EmptyState>Nenhum gasto registrado ainda.</EmptyState>
        </div>
      )}
    </div>
  );
}

function Viagens({
  viagens,
  recarregar,
}: {
  viagens: ReturnType<typeof useViagens>['viagens'];
  recarregar: () => void;
}) {
  const { mostrar } = useToast();

  const [descricao, setDescricao] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [data, setData] = useState(todayISO());
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const { error } = await supabase.from('viagens').insert({
      descricao: descricao.trim(),
      valor_total: Number(valorTotal),
      data,
    });
    setSalvando(false);

    if (error) {
      mostrar(error.message, 'erro');
      return;
    }

    mostrar('Viagem registrada!', 'sucesso');
    setDescricao('');
    setValorTotal('');
    setData(todayISO());
    recarregar();
  }

  async function excluir(id: string) {
    if (!confirm('Excluir essa viagem?')) return;
    const { error } = await supabase.from('viagens').delete().eq('id', id);
    if (error) {
      mostrar(error.message, 'erro');
      return;
    }
    mostrar('Viagem excluída.', 'sucesso');
    recarregar();
  }

  return (
    <div>
      <Card>
        <h2 className="font-bold mb-1">Viagens</h2>
        <p className="text-xs text-gray-500 mb-3">
          Idas pra comprar camisa (ex: SP). Anota o total gasto em cada uma — entra na conta do lucro líquido junto
          com os outros gastos.
        </p>
        <form onSubmit={handleSubmit}>
          <Label htmlFor="viagem-descricao">Descrição</Label>
          <Input
            id="viagem-descricao"
            required
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex: Ida 1 - SP"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="viagem-valor">Valor total (R$)</Label>
              <Input
                id="viagem-valor"
                type="number"
                min={0}
                step={0.01}
                required
                value={valorTotal}
                onChange={(e) => setValorTotal(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="viagem-data">Data</Label>
              <Input id="viagem-data" type="date" required value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>

          <Button type="submit" disabled={salvando} className="w-full mt-4">
            {salvando ? 'Registrando...' : 'Registrar viagem'}
          </Button>
        </form>
      </Card>

      {viagens.length > 0 ? (
        <div className="flex flex-col gap-2.5 mt-3">
          {viagens.map((v) => (
            <div
              key={v.id}
              className="flex justify-between items-center bg-white border border-gray-200 rounded-xl p-3 gap-2"
            >
              <div className="min-w-0">
                <div className="font-bold truncate">{v.descricao}</div>
                <div className="text-xs text-gray-500 mt-0.5">{formatDateBR(v.data)}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="font-bold text-red-600">-{formatBRL(v.valor_total)}</div>
                <Button variant="danger" className="!px-2.5 !py-1.5 text-xs" onClick={() => excluir(v.id)}>
                  Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3">
          <EmptyState>Nenhuma viagem registrada ainda.</EmptyState>
        </div>
      )}
    </div>
  );
}
