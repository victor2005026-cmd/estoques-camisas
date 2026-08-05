export type Aba = 'venda' | 'estoque' | 'cadastro' | 'relatorios';

const ABAS: { id: Aba; label: string }[] = [
  { id: 'venda', label: 'Venda' },
  { id: 'estoque', label: 'Estoque' },
  { id: 'cadastro', label: 'Cadastro' },
  { id: 'relatorios', label: 'Relatórios' },
];

export default function BottomNav({ ativa, onChange }: { ativa: Aba; onChange: (a: Aba) => void }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-lg mx-auto flex px-1 py-1.5">
        {ABAS.map((aba) => (
          <button
            key={aba.id}
            type="button"
            onClick={() => onChange(aba.id)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg mx-0.5 ${
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
