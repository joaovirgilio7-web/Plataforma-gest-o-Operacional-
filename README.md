# Plataforma Praias

Aplicação web com autenticação, dashboard protegido, mapa interativo e conteúdos informativos.

## Arranque local

```powershell
npm start
```

Depois abre `http://localhost:3000`.

Na primeira abertura, a plataforma mostra a página de configuração para criar o primeiro administrador.

## Variáveis úteis em produção

- `PORT`: porta HTTP, por defeito `3000`.
- `SESSION_SECRET`: segredo longo e aleatório para assinar sessões.
- `NODE_ENV=production`: ativa cookies `Secure`.

Exemplo:

```powershell
$env:NODE_ENV="production"
$env:SESSION_SECRET="muda-isto-para-um-segredo-longo"
npm start
```

## Online

Esta app pode ser publicada num serviço Node.js como Render, Railway, Fly.io ou num VPS. Para utilizadores reais, usa HTTPS e define sempre `SESSION_SECRET`.
