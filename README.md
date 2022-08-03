# GitHubDataMiner

## Instalação e Execução

Eu rodei o projeto na versão 16.15.0 do node e 8.5.5 do npm e instalei o MongoDB pelo docker, também consegui rodar no download normal do [Mongo](https://www.mongodb.com/try/download/community), se rodar a versão baixada no site do mongo não precisa criar o usuário de admin e se não mudou as configurações do mongo a string do URI de exemplo já está certa.

Para rodar o projeto clone o repositorio e depois acesse ele e instale as bibliotecas com o seguinte comando
```
npm install
```
Crie o arquivo .env com os seus dados seguindo o exemplo do .env.example

O token do github você gera [aqui](https://github.com/settings/tokens), eu acredito que não precisa marcar nenhuma permissão para rodar em projeto público, mas se for projeto privado talvez tenha que escolher alguma opção.

Eu recomendo rodar salvando a saída em algum arquivo de texto, execute o script da seguinte forma:
```
node . >> log.txt
```

Se preferir não salvar em um arquivo de log e só deixar a saida no terminal, rode o script com:
```
node .
```

## Erros

Se der algum erro (menos o erro 404, esse significa que a issue foi deletada) quando tiver buscando alguma issue você vai ter que fazer algumas modificações no código para pegar só o que deu erro, para isso comente as linhas do codigo do que você já conseguiu buscar dos dados, ou seja, essas linhas que salvam no banco de dados:

```js
  await issuesCollection.insertOne({ issue_id, issue_data });
  await commentsCollection.insertOne({ issue_id, comments_data });
  await eventsCollection.insertOne({ issue_id, events_data });
  await timelineCollection.insertOne({ issue_id, timeline_data });
  await pullCollection.insertOne({ issue_id, pr_data });
```

Edite no loop a issue que você precisa

```js
for(let i = ISSUE QUE DEU ERRO; i <= ISSUE QUE DEU ERRO; i++) {
```

Se for varias issues em sequencia voce pode mudar o alcance do loop.

### Exemplo tratamento de erro:

Deu o seguinte erro no arquivo de log
```
Got an error while fetching issue timeline 1337, message: erro de exemplo
```

Você vai mudar o alcance do loop do for para pegar a issue 1337 e comentar as linhas que salvam no banco de dados da issues/comments/events/pull, uma vez que você só precisa dos dados da timeline

A unica exceção é quando da erro ao buscar a issue, porque ai você não precisa comentar nada, o script vai pular essa issue por completo.