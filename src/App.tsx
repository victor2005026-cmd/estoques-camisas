import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import BottomNav, { type Aba } from './components/BottomNav';
import Venda from './pages/Venda';
import Estoque from './pages/Estoque';
import Cadastro from './pages/Cadastro';
import Relatorios from './pages/Relatorios';
import { Spinner } from './components/ui';

export default function App() {
  const { session, loading, signOut } = useAuth();
  const [aba, setAba] = useState<Aba>('venda');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Spinner />
      </div>
    );
  }

  if (!session) return <Login />;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-10 bg-brand-500 text-white">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <img src="/logo-header.png" alt="LV Sports" className="w-9 h-9 rounded-lg" />
            <h1 className="font-bold">Vendas de Camisas</h1>
          </div>
          <button type="button" onClick={signOut} className="text-xs text-white/80 underline">
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 pb-24">
        {aba === 'venda' && <Venda />}
        {aba === 'estoque' && <Estoque />}
        {aba === 'cadastro' && <Cadastro />}
        {aba === 'relatorios' && <Relatorios />}
      </main>

      <BottomNav ativa={aba} onChange={setAba} />
    </div>
  );
}
