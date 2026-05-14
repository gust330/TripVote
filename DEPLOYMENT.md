# 🚀 Guia de Deployment — TripVote

Tempo estimado: **10 minutos**. Tudo gratuito.

---

## PASSO 1 — Criar a base de dados no Supabase

1. Vai a **https://supabase.com** e clica em **"Start your project"**
2. Cria conta (podes usar o Google)
3. Clica em **"New project"**
   - Nome: `tripvote`
   - Password: escolhe uma (guarda-a, não precisas dela para já)
   - Region: `West EU (Ireland)` — mais próximo de Portugal
4. Espera ~1 minuto até o projeto estar pronto

### Criar as tabelas

No menu lateral clica em **SQL Editor** e cola este código, depois clica **Run**:

```sql
-- Tabela de salas (grupos)
create table rooms (
  id          bigint generated always as identity primary key,
  code        text unique not null,
  name        text not null,
  created_at  timestamptz default now()
);

-- Tabela de votos
create table votes (
  id          bigint generated always as identity primary key,
  room_code   text not null references rooms(code),
  name        text not null,
  destination text[],
  duration    text[],
  months      text[],
  budget      text,
  activities  text[],
  created_at  timestamptz default now()
);

-- Permitir leitura e escrita pública (sem login necessário)
alter table rooms enable row level security;
alter table votes  enable row level security;

create policy "public read rooms"  on rooms for select using (true);
create policy "public insert rooms" on rooms for insert with check (true);
create policy "public read votes"  on votes  for select using (true);
create policy "public insert votes" on votes  for insert with check (true);
```

### Copiar as credenciais

1. No menu lateral vai a **Settings → API**
2. Copia:
   - **Project URL** → algo como `https://abcdefgh.supabase.co`
   - **anon public** key → string longa começada por `eyJ...`

---

## PASSO 2 — Colocar o código no GitHub

1. Vai a **https://github.com** e cria conta (se não tens)
2. Clica em **"New repository"**
   - Nome: `tripvote`
   - Visibilidade: **Public** (necessário para o Vercel gratuito)
   - Clica **"Create repository"**

3. Abre o terminal no teu computador dentro da pasta `tripvote` e corre:

```bash
git init
git add .
git commit -m "primeiro commit"
git branch -M main
git remote add origin https://github.com/SEU_USERNAME/tripvote.git
git push -u origin main
```

> Substitui `SEU_USERNAME` pelo teu nome de utilizador do GitHub.

---

## PASSO 3 — Fazer deploy no Vercel

1. Vai a **https://vercel.com** e clica **"Sign up"** → continua com o GitHub
2. Clica em **"Add New Project"**
3. Importa o repositório `tripvote`
4. Antes de clicar Deploy, expande **"Environment Variables"** e adiciona:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://abcdefgh.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` (a chave anon do passo 1) |

5. Clica **Deploy** 🎉

Após ~1 minuto, o Vercel dá-te um link do tipo:
```
https://tripvote-abc123.vercel.app
```

**É esse link que partilhas com os teus amigos!**

---

## PASSO 4 — Domínio personalizado (opcional)

Se quiseres um link mais bonito como `tripvote.vercel.app`:

1. No painel do Vercel, vai ao teu projeto → **Settings → Domains**
2. Escreve o nome que queres (ex: `viagem-turma12`)
3. O Vercel sugere `viagem-turma12.vercel.app` — aceita, é grátis

---

## ✅ Resumo das contas necessárias

| Serviço | Para quê | Grátis? |
|---------|----------|---------|
| **Supabase** | Base de dados | ✅ Sim (até 500MB) |
| **GitHub** | Guardar o código | ✅ Sim |
| **Vercel** | Alojar o site | ✅ Sim |

---

## 🆘 Problemas comuns

**"Sala não encontrada"** após deploy
→ Confirma que as variáveis de ambiente estão corretas no Vercel (Settings → Environment Variables)

**Erro ao criar sala**
→ Verifica se correste o SQL do Passo 1 corretamente no Supabase

**Site não atualiza após mudança de código**
→ Basta fazer `git add . && git commit -m "update" && git push` — o Vercel atualiza automaticamente
