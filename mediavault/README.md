# 🎮 MEDIAVAULT — Gerenciador de Jogos

Uma aplicação web moderna com estética **Neo-Brutalista** para organizar e gerenciar seu backlog pessoal de jogos. Sincronização 100% em tempo real com o **Supabase**, reorganização inteligente por temática com o **Google Gemini AI** e um seletor dinâmico para jogar **2 jogos contrastantes por vez** (1 pesado e 1 leve).

---

## ⚡ Principais Funcionalidades

- **🎨 Design Neo-Brutalismo**: Bordas pretas grossas, cores contrastantes vibrantes, sombras sólidas projetadas e microinterações de clique físico.
- **🌓 Suporte a Dark Mode**: Alternância rápida de tema (Light / Dark) com persistência automática no navegador.
- **🎯 Foco Atual (2 Jogos Contrastantes)**:
  - Destaca no topo da página 2 jogos com estilos opostos para você jogar em paralelo (ex: 1 jogo tenso/pesado e 1 jogo casual/leve).
  - Botão de **Trocar Sugestões** para sortear novas duplas inteligentes do seu backlog.
- **🧠 Reorganização Temática com Gemini AI**:
  - Analisa os gêneros e tags dos seus jogos e os agrupa por afinidade temática (ex: juntar jogos de terror de sobrevivência, sequências de RPG, etc.).
  - A chave da API do Gemini fica **guardada com segurança no seu próprio Supabase**.
- **🗄️ Persistência Estrita no Supabase**:
  - O Supabase é a fonte única da verdade: tudo o que você adiciona, edita, exclui ou reordena é salvo e sincronizado diretamente no banco de dados na nuvem.
- **📚 Visão por Gênero e Biblioteca Completa**:
  - Filtre por status: *Backlog*, *Jogando*, *Completado*, *Platinado (100%)* e *Abandonado*.
- **🔍 Busca em Tempo Real**:
  - Pesquisa instantânea por título, gênero ou tags de similaridade.

---

## 📁 Estrutura do Projeto

```
mediavault/
├── index.html           # Estilo V1: Neo-Brutalismo Web (alto contraste e bordas duras)
├── style.css            # CSS Neo-Brutalista
├── v2.html              # Estilo V2: Cyberpunk 2077 / Night City Netrunner UI
├── style-v2.css         # CSS Cyberpunk (Amarelo Night City, Neon Cyan, Hot Pink, cantos angulares)
├── app.js               # Lógica da aplicação, Supabase SDK e Gemini AI (compartilhada)
├── supabase_schema.sql  # Script de criação do banco de dados (tabelas e RLS)
└── README.md            # Documentação do projeto
```

---

## 🚀 Como Configurar e Rodar

### 1. Configurar o Supabase

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. No painel do Supabase, acesse **SQL Editor** > **New Query**.
3. Copie todo o conteúdo do arquivo [`supabase_schema.sql`](./supabase_schema.sql), cole no editor e clique em **Run**.
4. Vá em **Project Settings** > **API** e copie:
   - **Project URL**
   - **Project API Keys (`anon` / `public`)**

### 2. Configurar a Chave do Gemini AI (Opcional)

1. Obtenha uma chave de API gratuita no [Google AI Studio](https://aistudio.google.com).
2. Essa chave pode ser inserida diretamente no modal de configurações da aplicação ou ao clicar no botão **Reorganizar por IA**.

### 3. Conectar a Aplicação

Abra a aplicação no navegador e clique no ícone **⚙️ Configurações** no cabeçalho superior:
- Preencha a **Supabase Project URL**
- Preencha a **Supabase Anon Key**
- *(Opcional)* Preencha a **Gemini AI Key**
- Clique em **Salvar e Conectar**

> **Dica**: Você também pode preencher as constantes `EMBEDDED_CONFIG` no topo do arquivo [`app.js`](./app.js) caso prefira deixar as credenciais pré-configuradas no código.

---

## 🌐 Deploy no GitHub Pages

Este projeto foi construído em **HTML/CSS/JS Vanilla puro**, sem etapas de build (zero npm/bundlers).

1. No repositório do seu GitHub, vá em **Settings** > **Pages**.
2. Em **Build and deployment > Source**, selecione **Deploy from a branch**.
3. Selecione a branch `main` e a pasta `/ (root)`.
4. Salve e acesse sua URL pública do GitHub Pages!

---

## 🛠️ Tecnologias Utilizadas

- **HTML5 & Vanilla CSS3** (Design System Neo-Brutalista com CSS Custom Properties)
- **Vanilla JavaScript (ES6+)**
- **[Supabase JS Client](https://supabase.com)** (Persistência em nuvem e Row Level Security)
- **[Google Gemini API (1.5 Flash)](https://ai.google.dev/)** (Reorganização generativa)
- **[Font Awesome 6](https://fontawesome.com)** (Ícones em toda a interface)
- **Google Fonts** (*Space Grotesk* e *Bebas Neue*)
