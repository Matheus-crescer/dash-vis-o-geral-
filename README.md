# Dashboard de Pedidos — Julho 2026

Painel executivo estático (HTML/CSS/JS puro, sem build) pronto para deploy na Vercel.

## Como publicar na Vercel

**Opção A — pelo site (mais fácil, sem instalar nada):**
1. Acesse https://vercel.com e faça login (dá pra usar conta do Google/GitHub).
2. Clique em **"Add New" → "Project"**.
3. Escolha **"Deploy without Git"** / arraste esta pasta (ou o .zip extraído) na área de upload.
4. Confirme — a Vercel detecta automaticamente que é um site estático (não precisa configurar build command nem output directory).
5. Em ~30 segundos você recebe uma URL pública tipo `seu-projeto.vercel.app`.

**Opção B — pela CLI:**
```bash
npm i -g vercel
cd pasta-extraida
vercel --prod
```
Siga as perguntas (aceite os padrões) e a URL de produção é exibida ao final.

## Estrutura
- `index.html` — o dashboard completo (HTML + CSS + JS embutidos, sem dependências locais).
- `vercel.json` — configuração mínima (URLs limpas).

## Observação
O dashboard carrega Chart.js e Font Awesome via CDN (cdnjs.cloudflare.com) e fontes via Google Fonts — é necessário que quem acessar tenha internet ativa, mas não é preciso nenhum servidor/backend: é 100% estático.
