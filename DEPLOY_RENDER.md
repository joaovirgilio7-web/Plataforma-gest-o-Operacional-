# Publicar Online com Render

Este projeto está preparado para publicar no Render com HTTPS automático.

## O que vais precisar

- Conta no Render: https://render.com
- Repositório GitHub com esta pasta do projeto
- Um serviço Web Node.js
- Disco persistente para guardar utilizadores, registos e PDFs

## Passos

1. Cria um repositório no GitHub e envia estes ficheiros.
2. No Render, escolhe **New > Blueprint** se quiseres usar o `render.yaml`.
3. Liga o repositório GitHub.
4. Confirma o serviço `plataforma-praias`.
5. Garante que existe um disco persistente montado em:

```text
/opt/render/project/src/data
```

6. Confirma as variáveis:

```text
NODE_ENV=production
DATA_DIR=/opt/render/project/src/data
SESSION_SECRET=<gerado automaticamente ou segredo forte>
NODE_VERSION=24
```

7. Faz deploy.

No fim, o Render dá-te um link HTTPS parecido com:

```text
https://plataforma-praias.onrender.com
```

Esse é o link que podes enviar aos utilizadores.

## Nota importante

Sem disco persistente, os dados guardados pela plataforma podem desaparecer quando o serviço reiniciar ou redeployar. Para utilizadores reais, mantém o disco ligado ou evoluímos a plataforma para uma base de dados Postgres.
