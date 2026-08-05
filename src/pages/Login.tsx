import type { FormEvent } from 'react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Input, Label } from '../components/ui';

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const { error } = await signIn(email.trim(), senha);
    setCarregando(false);
    if (error) setErro(error);
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <img src="/logo-header.png" alt="LV Sports" className="w-16 h-16 rounded-xl mx-auto mb-3" />
        <h1 className="text-lg font-bold text-center mb-1">Vendas de Camisas</h1>
        <p className="text-sm text-gray-500 text-center mb-4">Entre com sua conta pra continuar</p>
        <form onSubmit={handleSubmit}>
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Label htmlFor="senha">Senha</Label>
          <Input
            id="senha"
            type="password"
            autoComplete="current-password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          {erro && <p className="text-red-600 text-sm font-semibold mt-3">{erro}</p>}
          <Button type="submit" disabled={carregando} className="w-full mt-4">
            {carregando ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
