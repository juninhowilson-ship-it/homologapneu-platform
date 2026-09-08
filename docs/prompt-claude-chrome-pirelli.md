# Prompt para o Claude no Chrome — coleta do catálogo Pirelli

Cole o bloco abaixo no Claude no Chrome, com o navegador logado e livre para
navegar. O resultado esperado é um CSV que entra direto no importador de
catálogo de fabricante do HomologaPneu.

---

Você vai coletar, do site oficial da Pirelli Brasil, a tabela de aplicação e
homologação de pneus por veículo. O destino é uma base técnica de homologação
usada por lojistas para decidir qual pneu vender — dado errado ali vira
recomendação errada de pneu, então precisão importa mais que volume.

## Passo 1 — localizar a fonte, sem chutar

Comece em https://www.pirelli.com/tyres/pt-br/carro e procure a seção que lista
pneus POR VEÍCULO (marca → modelo → ano/versão). Nomes prováveis: "Encontre seu
pneu", "Busca por veículo", "Equipamento original", "Homologação", "Aplicação".

Se após procurar de verdade não existir catálogo por veículo no site oficial,
PARE e me diga isso, com as URLs que você visitou. Não substitua por site de
varejo (pneustore, pneufree, bellenzier e similares) nem por blog: esses não são
fonte oficial e não servem para esta base. Se houver PDF oficial de "Tabela de
Aplicação e Homologação", ele é a fonte preferida — me avise que encontrou.

## Passo 2 — o que coletar

Uma linha por combinação veículo + pneu. Colete TODOS os veículos que o catálogo
listar, não uma amostra.

Colunas exatas (use estes cabeçalhos, nesta ordem):

vehicleBrand,vehicleModel,anoInicial,anoFinal,versao,motor,medida,descricao,codigoInterno,homologado,aplicacao,eixo,phaseOut,sourceUrl

- `vehicleBrand` — marca do veículo, como aparece na página
- `vehicleModel` — modelo do veículo, como aparece na página
- `anoInicial` / `anoFinal` — anos que a página associa àquela aplicação.
  **Este é o campo mais importante da coleta.** Se a página não informar ano,
  deixe as duas células VAZIAS. Nunca deduza o ano a partir do modelo.
- `versao` / `motor` — só se a página distinguir versão ou motorização
  (ex.: "1.0 Turbo", "XEi"). Vazio se ela não distinguir.
- `medida` — medida do pneu como escrita (ex.: `205/55R16`)
- `descricao` — descrição completa do produto como aparece
  (ex.: `205/55R16 91V P7cint(KS)`)
- `codigoInterno` — código/SKU Pirelli, se houver
- `homologado` — `SIM` ou `NAO`, conforme a página declarar
- `aplicacao` — texto livre da coluna "Aplicação", se houver
- `eixo` — `DIANTEIRO`, `TRASEIRO` ou `AMBOS`, se a página declarar
- `phaseOut` — `SIM` se marcado como descontinuado/fora de linha, senão `NAO`
- `sourceUrl` — a URL exata de onde aquela linha saiu

## Passo 3 — a distinção que define o trabalho

Preciso das duas classificações, separadas e nunca misturadas:

- **HOMOLOGADO** — a Pirelli declara que o pneu foi homologado pela montadora
  para aquele veículo. É equipamento original aprovado.
- **APLICAÇÃO** — o pneu serve dimensionalmente naquele veículo, mas não há
  homologação declarada. É compatibilidade, não aprovação.

Se a página usar outras palavras (ex.: "OE", "original", "recomendado",
"equivalente"), **transcreva o termo original** na coluna `aplicacao` e me diga
quais termos encontrou. Não traduza um termo ambíguo para HOMOLOGADO por conta
própria.

## Regras rígidas

1. **Nunca invente e nunca complete lacuna.** Célula sem dado na origem é
   célula vazia no CSV. Não use conhecimento próprio sobre carros para
   preencher medida, ano ou versão.
2. **Nunca junte gerações.** Se o catálogo lista "Corolla" sem separar geração,
   deixe ano vazio e registre isso no relatório — não distribua a medida entre
   os anos. Uma medida de Corolla dos anos 90 num Corolla 2024 é recomendação
   perigosa.
3. **Não converta nada.** Medida, índices e unidades vão como estão escritos.
4. **Não deduplique.** Se a mesma medida aparece duas vezes com status
   diferente, são duas linhas.
5. Se a tabela for paginada ou carregar por scroll, percorra até o fim e diga
   quantas páginas percorreu.

## Passo 4 — entrega

1. O CSV completo, com o cabeçalho exato acima.
2. Um relatório curto com:
   - total de linhas, e quantas ficaram HOMOLOGADO vs APLICAÇÃO
   - quantas linhas ficaram **sem ano** (é o número que mais me interessa)
   - marcas e modelos cobertos
   - o que você não conseguiu coletar, e por quê (bloqueio, JS, login, paginação)
   - os termos de status que encontrou, literais

Prefiro 200 linhas certas e auditáveis a 2000 linhas com ano adivinhado.
