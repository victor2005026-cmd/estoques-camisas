export type Aba = 'venda' | 'estoque' | 'cadastro' | 'lista' | 'financeiro' | 'relatorios';

const ABAS: { id: Aba; label: string }[] = [
  { id: 'venda', label: 'Venda' },
  { id: 'estoque', label: 'Estoque' },
  { id: 'cadastro', label: 'Cadastro' },
  { id: 'lista', label: 'Lista' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'relatorios', label: 'Relatórios' },
];

export default function BottomNav({ ativa, onChange }: { ativa: Aba; onChange: (a: Aba) => void }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-lg mx-auto flex px-0.5 py-1.5 gap-0.5">
        {ABAS.map((aba) => (
          <button
            key={aba.id}
            type="button"
            onClick={() => onChange(aba.id)}
            className={`flex-1 py-2 px-0.5 text-[11px] leading-tight font-semibold rounded-lg ${
              ativa === aba.id ? 'text-brand-600 bg-brand-50' : 'text-gray-500'
            }`}
          >
            {aba.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
