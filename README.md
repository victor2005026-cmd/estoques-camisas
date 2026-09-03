# Vendas de Camisas — Web (React + Supabase)

Sistema de controle de vendas de camisas para uso entre duas pessoas, com
**React + Vite + TypeScript + Tailwind** no frontend e **Supabase (Postgres)**
como banco de dados, autenticação e storage de fotos. Hospedado de graça na
**Vercel**.

<img width="1918" height="867" alt="Captura de tela 2026-09-03 103926" src="https://github.com/user-attachments/assets/71bde303-142b-447b-9e8d-6f804af14898" />
<img width="1917" height="863" alt="Captura de tela 2026-09-03 103909" src="https://github.com/user-attachments/assets/72453a8a-9e5e-44dd-8895-93106154e286" />
<img width="1919" height="862" alt="Captura de tela 2026-09-03 103856" src="https://github.com/user-attachments/assets/65f99347-16b0-4e1e-aadf-42250c417baa" />


> Este projeto substitui a versão anterior em Google Apps Script (que ficou
> lenta por causa da latência das chamadas à planilha). O código antigo em
> Apps Script foi preservado em `_legacy-apps-script-backup/` nesta mesma
> pasta, sem uso — pode ser apagado quando não precisar mais dele.

## Stack

- **Frontend:** React 18 + Vite + TypeScript, estilizado com Tailwind CSS, mobile-first, com menu inferior fixo (tipo app).
- **Backend/dados:** Supabase (Postgres), acessado via `@supabase/supabase-js`.
- **Autenticação:** Supabase Auth (e-mail/senha) — só vocês dois têm login.
- **Realtime:** as telas de Estoque, Venda e Relatórios atualizam sozinhas quando o outro usuário faz uma alteração (via Supabase Realtime), sem precisar dar refresh.
- **Hospedagem:** Vercel (free tier).
- **PWA:** instalável na tela inicial do celular (ícones incluídos em `public/` — são placeholders simples, troque por um logo seu se quiser).

## Estrutura do projeto

```
.
├── .env.example                    variáveis de ambiente (copie para .env)
├── index.html                       entrada do Vite
├── vite.config.ts                   config do Vite + PWA
├── tailwind.config.js / postcss.config.js
├── public/
│   └── icon-192.png, icon-512.png   ícones do PWA (placeholders)
├── supabase/
│   └── migrations/0001_init.sql     schema completo (tabelas, RLS, triggers, storage)
├── src/
│   ├── main.tsx, App.tsx, index.css
│   ├── lib/supabase.ts              cliente Supabase
│   ├── lib/imagem.ts                compressão de foto no navegador
│   ├── types/index.ts               tipos (Camisa, Venda, etc.)
│   ├── context/AuthContext.tsx      sessão/login
│   ├── context/ToastContext.tsx     feedback visual (sucesso/erro)
│   ├── hooks/useCamisas.ts          lista de camisas + Realtime
│   ├── hooks/useVendas.ts           histórico de vendas + Realtime
│   ├── components/ui.tsx            botões, inputs, badges etc. reutilizáveis
│   ├── components/BottomNav.tsx     menu inferior fixo
│   └── pages/
│       ├── Login.tsx
│       ├── Venda.tsx                registrar venda
│       ├── Estoque.tsx              estoque atual (destaque quando baixo)
│       ├── Cadastro.tsx             CRUD de camisas + upload de foto
│       └── Relatorios.tsx           totais, lucro, por cliente, pendências
└── _legacy-apps-script-backup/      projeto antigo (Apps Script), não usado
```

## Banco de dados

Duas tabelas:

**camisas** — `id, modelo, tamanho (P/M/G/GG), estoque, preco_venda, preco_custo, estoque_minimo, foto_url, created_at`

**vendas** — `id, data, cliente, camisa_id (fk), quantidade, valor_recebido, forma_pagamento (Pix/Dinheiro/Cartão), status_pagamento (Pago/Pendente/Parcelado), observacoes, created_at`

O arquivo `supabase/migrations/0001_init.sql` cria tudo isso, mais:

- **Row Level Security** nas duas tabelas — só usuários autenticados (você e seu amigo) conseguem ler/escrever.
- **Trigger `abater_estoque_venda`**: ao inserir uma venda, abate a quantidade do estoque da camisa automaticamente e **bloqueia a venda** (com mensagem de erro clara) se não houver estoque suficiente.
- **Trigger `devolver_estoque_venda`**: ao excluir uma venda, devolve a quantidade ao estoque (usado pra corrigir lançamentos errados ou cancelar uma pendência que não foi paga).
- **Bucket de Storage `fotos-camisas`** (público para leitura, só autenticados podem enviar) — usado pelo upload de foto no Cadastro.
- Publicação das tabelas no Realtime, pra tela atualizar sozinha.

O **lucro** nos relatórios é calculado como `valor_recebido - (preco_custo × quantidade)` — ou seja, lucro sobre o dinheiro efetivamente recebido, mais correto quando existem vendas parceladas ou pendentes.

## Passo a passo: configurar o Supabase

### 1. Aplicar a migration

1. Abra seu projeto em [supabase.com](https://supabase.com/dashboard).
2. Vá em **SQL Editor** (menu lateral) → **New query**.
3. Copie todo o conteúdo de `supabase/migrations/0001_init.sql` e cole ali.
4. Clique em **Run**. Deve rodar sem erros e criar as tabelas, políticas, triggers, storage e realtime de uma vez.

### 2. Cadastrar os dois usuários

1. No painel do Supabase, vá em **Authentication > Users**.
2. Clique em **Add user > Create new user**.
3. Preencha o e-mail e uma senha pra você, marque **Auto Confirm User** (pra não precisar confirmar por e-mail) e salve.
4. Repita pro e-mail do seu amigo.
5. Vocês vão usar esse e-mail/senha pra logar no site.

### 3. Pegar as credenciais do projeto

Em **Project Settings > API**, copie:
- **Project URL** → vai em `VITE_SUPABASE_URL`
- **anon public key** → vai em `VITE_SUPABASE_ANON_KEY`

## Rodando localmente

```bash
npm install
cp .env.example .env
# edite o .env e cole as duas credenciais do passo acima
npm run dev
```

Abra `http://localhost:5173`, faça login com um dos usuários cadastrados no Supabase e pronto.

Outros comandos úteis:
- `npm run build` — gera a versão de produção em `dist/` (também roda o type-check do TypeScript).
- `npm run preview` — serve o build de produção localmente pra testar antes de publicar.
- `npm run lint` — só o type-check, sem build.

## Deploy na Vercel

### Opção A — pelo terminal (mais rápido pra primeira vez)

```bash
npm install -g vercel   # se ainda não tiver o CLI
vercel login
vercel
```

Siga as perguntas (aceite os padrões — Vercel detecta Vite automaticamente).
Depois, configure as variáveis de ambiente:

```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

Cole os valores quando pedido (escolha "Production", "Preview" e "Development" quando perguntar os ambientes). Depois rode:

```bash
vercel --prod
```

### Opção B — pelo GitHub (deploy contínuo)

1. Suba este projeto pra um repositório no GitHub (`git init`, `git add`, `git commit`, `git push`).
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório.
3. A Vercel detecta Vite automaticamente (build command `vite build`, output `dist`).
4. Em **Environment Variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores do seu projeto Supabase.
5. Clique em **Deploy**.

A partir daí, todo `git push` na branch principal gera um novo deploy automático.

## Atualizando o sistema depois

- **Deploy pelo GitHub:** só dar `git push` — a Vercel builda e publica sozinha.
- **Deploy pelo terminal:** rode `vercel --prod` de novo depois de alterar o código.
- **Mudanças no banco:** crie um novo arquivo em `supabase/migrations/` (ex: `0002_algo.sql`) e rode ele no SQL Editor do Supabase — não edite o `0001_init.sql` depois que já rodou, pra manter o histórico de mudanças rastreável.

## Compartilhar com seu amigo

- Ele já tem login próprio (cadastrado no passo 2 acima).
- Basta mandar a URL do deploy da Vercel (ex: `https://seu-projeto.vercel.app`).
- Como o RLS está restrito a `authenticated`, ele só vê os dados depois de logar — e enxerga os mesmos dados que você, em tempo real.
