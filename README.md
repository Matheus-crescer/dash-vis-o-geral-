# Painel de Pedidos — com atualização automática

Este projeto tem duas páginas:

- **`/` (index.html)** — o painel público. Todo mundo que abrir o link vê os
  mesmos dados, sempre os mais recentes.
- **`/upload.html`** — página protegida por senha, só para você. Envie a
  planilha nova ali e o painel público atualiza na hora, para todo mundo.

Não existe banco de dados tradicional: os dados calculados a partir da
planilha ficam guardados em um "Blob" (arquivo na nuvem) da própria Vercel.

---

## Passo a passo (uma única vez)

### 1. Faça o deploy do projeto
No painel da Vercel: **Add New → Project → Deploy without Git**, e arraste
esta pasta (ou o zip) para a área de upload. A Vercel detecta sozinha que
existe uma pasta `/api` (funções) e arquivos estáticos (`index.html`,
`upload.html`) — não precisa configurar build command nem output directory.

### 2. Crie o Blob Store (armazenamento dos dados)
Dentro do projeto na Vercel:
1. Vá na aba **Storage**
2. Clique em **Create Database → Blob**
3. Dê um nome (qualquer um) e clique em **Create**
4. A Vercel já conecta automaticamente esse Blob Store ao projeto e cria a
   variável de ambiente `BLOB_READ_WRITE_TOKEN` sozinha. Você não precisa
   copiar nada manualmente.

### 3. Defina a senha de atualização
Ainda no projeto: **Settings → Environment Variables**
- Nome: `UPLOAD_PASSWORD`
- Valor: uma senha à sua escolha (ex: `farma2026!`)
- Marque os três ambientes (Production, Preview, Development)
- Clique em **Save**

### 4. Redeploy
Depois de criar o Blob Store e a variável de ambiente, vá em
**Deployments → (três pontinhos no último deploy) → Redeploy**, para que o
projeto passe a enxergar as duas configurações novas.

Pronto — a partir daqui é só usar.

---

## Como usar no dia a dia

1. Acesse `https://seu-projeto.vercel.app/upload.html`
2. Digite a senha que você definiu no passo 3
3. Arraste a planilha `.xlsx` (mesmo modelo de sempre)
4. Clique em **Enviar e atualizar painel**
5. Pronto — quem acessar `https://seu-projeto.vercel.app/` já vê os dados
   novos, sem precisar fazer nada

O painel sempre recalcula tudo a partir da aba **"Dados Detalhados"** da
planilha (é a fonte mais confiável). As abas "Top Produtos", "Canais e SLA"
(detalhamento por courrier), "Cupons e Descontos" (tipos de desconto) e
"Frete" são lidas como complemento — se alguma dessas abas não existir na
planilha enviada, a seção correspondente do painel simplesmente mostra
"não disponível nesta planilha" em vez de quebrar.

---

## Perguntas frequentes

**Ninguém enviou uma planilha ainda — o que aparece no painel?**
Um conjunto de dados de exemplo (Julho/2026), com um aviso no topo da
página convidando a enviar uma planilha nova.

**Esqueci a senha, e agora?**
Troque o valor de `UPLOAD_PASSWORD` em Settings → Environment Variables e
faça um redeploy.

**Dá pra ter mais de uma pessoa enviando planilha?**
Sim — qualquer pessoa com a senha e o link de `/upload.html` pode atualizar.
Não há um "histórico" de quem enviou o quê; o mais recente sempre substitui
o anterior.

**Os dados ficam guardados para sempre?**
O arquivo `data.json` no Blob Store é substituído a cada novo envio (não
acumula). Se quiser manter um histórico das planilhas originais, isso não é
feito automaticamente — guarde os arquivos `.xlsx` originais por fora, se
for importante para você.
