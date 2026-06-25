# Site MVP da X Capital Partners

Esta é uma primeira versão visual e funcional do site institucional da X Capital com vitrine de cartas contempladas e painel interno simples.

## O que já está pronto

1. Página inicial institucional
2. Página sobre a X Capital
3. Página de soluções
4. Página de cartas contempladas com filtros
5. Página para quem quer vender uma cota
6. Página de contato
7. Painel interno em `admin.html`
8. Cadastro, edição, reserva, venda e exclusão de cartas no navegador
9. Botões de WhatsApp com mensagem automática
10. Logo e dados da X Capital já aplicados

## Como testar no computador

Abra o arquivo `index.html` no navegador.

Depois acesse:

`admin.html`

Senha inicial:

`xcapital2026`

## Observação importante

Este painel é um protótipo local. Ele salva os dados no navegador usando localStorage. Isso serve para testar layout, fluxo e operação.

Para uso real pela equipe, com todos vendo as mesmas cartas cadastradas, o próximo passo é conectar Supabase ou outro banco de dados.

## Como publicar no Vercel

1. Crie um repositório no GitHub
2. Envie todos estes arquivos para o repositório
3. Entre na Vercel
4. Clique em New Project
5. Selecione o repositório
6. Framework Preset: Other
7. Build Command: deixe vazio
8. Output Directory: deixe vazio
9. Clique em Deploy

## Onde alterar dados principais

Arquivo:

`js/data.js`

Você pode alterar:

1. Cartas iniciais
2. WhatsApp de atendimento
3. Instagram
4. Endereço
5. Senha inicial do painel

## Próximo passo para produção

Para transformar este protótipo em um sistema real, use o arquivo:

`database/supabase_schema.sql`

Ele já tem uma sugestão de estrutura para banco de dados com cartas, leads e pedidos de avaliação de cotas.

## Atualização de logo

Esta versão usa os arquivos em PNG transparente:

- `assets/logo-xcapital-hs-preta.png` para cabeçalho em fundo claro.
- `assets/logo-xcapital-hs-branca.png` para áreas escuras.

Para publicar no Vercel, substitua os arquivos do projeto atual por esta pasta e faça novo deploy.


## Versão Supabase v1

Esta versão já está configurada com:

SUPABASE_URL=https://nwlkhsmliuljprdbuaiv.supabase.co

Para funcionar, execute no SQL Editor do Supabase o arquivo:

database/supabase_mvp_completo.sql

Depois suba esta pasta na Vercel.

Painel:
admin.html

Senha MVP:
xcapital2026

Aviso: o painel desta versão ainda usa senha simples no front-end. Serve para validar o fluxo. A próxima etapa profissional é criar login real com Supabase Auth.


## Correção de login v2

Agora o admin funciona tanto em:

/admin.html

quanto em:

/admin

Senha:
xcapital2026

O formulário foi corrigido para não redirecionar para ?password=xcapital2026.


## Correção admin v3

Esta versão substitui completamente o JavaScript do painel, corrigindo o problema do botão Entrar não responder.

Teste depois do deploy:

/admin.html

ou

/admin

Senha:
xcapital2026

Se o navegador carregar cache antigo, use aba anônima ou Ctrl + F5.


## Correção admin v4

O painel não entrava porque admin.html carregava site.js e admin.js juntos.
Os dois arquivos tinham variáveis com os mesmos nomes, então o navegador bloqueava o admin.js.
Nesta versão, admin.html não carrega mais site.js e o menu mobile foi adicionado diretamente no admin.js.

Acesse:
/admin
ou
/admin.html

Senha:
xcapital2026


## Acesso do painel v5

O painel agora usa dois campos:

Código de acesso:
4045

Senha temporária:
xcapital4045

Acesse:
/admin
ou
/admin.html

Observação: esta ainda é uma validação simples para MVP.


## Versão v6 melhorias comerciais

Antes de publicar esta versão, rode no Supabase SQL Editor:

database/supabase_v6_melhorias.sql

Novidades:
- Botão Excluir removido do painel.
- Botão Arquivar criado para tirar cartas da vitrine sem perder histórico.
- Lead com status, responsável e botão de WhatsApp.
- Página de cotas para avaliação dentro do painel.
- Formulário Venda sua cota salva no Supabase e abre WhatsApp.
- Página individual de cada carta em carta.html?id=ID.
- Botão flutuante de WhatsApp.
- Filtro por administradora na vitrine de cartas.
- Exportação JSON inclui cartas, leads e cotas para avaliação.

Acesso admin:
Código: 4045
Senha: xcapital4045


## Correção v6.1

Substituída a imagem do WhatsApp por uma logo correta em todos os pontos do site, incluindo:

- área de contato
- rodapé
- botão flutuante


## Ajuste v6.2

O botão flutuante do WhatsApp agora aparece somente como ícone flutuante, ocupando menos espaço na tela, especialmente no celular.
