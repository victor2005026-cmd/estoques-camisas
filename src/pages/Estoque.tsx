import { useState } from 'react';
import { useCamisas } from '../hooks/useCamisas';
import { Badge, Card, EmptyState, Input, Spinner } from '../components/ui';

export default function Estoque() {
  const { camisas, loading } = useCamisas();
  const [busca, setBusca] = useState('');

  const itens = camisas.filter((c) => !busca || c.modelo.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div>
      <Card>
        <h2 className="font-bold mb-2">Estoque atual</h2>
        <Input placeholder="Buscar por modelo..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </Card>

      <div className="flex flex-col gap-2.5 mt-3">
        {loading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : itens.length === 0 ? (
          <EmptyState>Nenhuma camisa encontrada.</EmptyState>
        ) : (
          itens.map((c) => {
            const baixo = c.estoque <= c.estoque_minimo;
            return (
              <div
                key={c.id}
                className={`flex items-center gap-2.5 border rounded-xl p-3 ${
                  baixo ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'
                }`}
              >
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
                    {c.estoque} un. em estoque · mínimo: {c.estoque_minimo}
                  </div>
                </div>
                <Badge tone={baixo ? 'danger' : 'success'}>{baixo ? 'Estoque baixo' : 'OK'}</Badge>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
