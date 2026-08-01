# database/import/ — importação em massa por planilha

Cada subpasta corresponde a uma tabela do banco. Coloque um CSV ou XLSX
com as colunas abaixo (nomes exatos, um por linha de cabeçalho) e importe
pelo botão **IMPORTAR DADOS** no painel administrativo (`/administracao`)
— escolha a entidade correspondente à pasta e selecione o arquivo.

Todas as importações são idempotentes (nunca duplicam — reexecutar o
mesmo arquivo atualiza o que mudou e ignora o que não mudou), geram um
lote auditável (visível no histórico de importações, com reversão
disponível) e um relatório de erro por linha quando algo não puder ser
importado.

## brands/ → TireManufacturer

| Coluna | Obrigatória | Observação |
|---|---|---|
| `nome` | sim | |
| `pais` | não | |
| `site` | não | |
| `observacoes` | não | |
| `logo` | não | URL |
| `status` | não | ativo/inativo |
| `confianca` | não | 0–100 |
| `brandPolicy` | não | `APPLICATION_ONLY` (padrão) \| `OEM_AND_APPLICATION` \| `OEM_ONLY` \| `HISTORICAL_ONLY` |

`slug` é gerado automaticamente a partir do `nome`.

## tire_models/ → TireModel

| Coluna | Obrigatória |
|---|---|
| `nome` | sim |
| `fabricante` | sim — precisa já existir em `brands/` |

## tire_sizes/ → Tire (SKU completo: modelo + medida + índices)

| Coluna | Obrigatória |
|---|---|
| `fabricante` | sim |
| `modelo` | sim |
| `familia` | não |
| `largura` | sim |
| `perfil` | sim |
| `aro` | sim |
| `indiceCarga` | sim |
| `indiceVelocidade` | sim |
| `runFlat` / `xl` / `seal` / `tubeless` | não (sim/não) |
| `categoria` | sim — PASSEIO/SUV/CAMINHONETE/ESPORTIVO/INVERNO/COMERCIAL |
| `segmento` | não |
| `ean` | não |
| `descricao` | não |
| `status` | não |
| `tecnologias` | não — nomes separados por `;` |

## vehicles/ → VehicleVersion (+ Model/Generation/Engine)

| Coluna | Obrigatória |
|---|---|
| `marca` | sim |
| `modelo` | sim |
| `versao` | sim |
| `codigoInterno` | não |
| `anoInicial` / `anoFinal` | sim |
| `anoFabricacaoInicial` / `anoFabricacaoFinal` | não |
| `motorizacao` | sim |
| `potencia` / `torque` | não |
| `combustivel` | sim |
| `categoria` | sim |
| `categoriaRegulatoria` | não |
| `segmento` | não |
| `plataforma` | não |
| `geracao` | não |
| `transmissao` / `marchas` | não |
| `tracao` | não |
| `portas` | não |
| `entreEixos` / `peso` | não |
| `pais` / `observacoes` / `status` | não |

## applications/ → TireVehicleApplication + HomologationEvidence

**Nunca cria homologação OEM** — só evidência de aplicação comercial/técnica.

| Coluna | Obrigatória |
|---|---|
| `fabricantePneu` | sim |
| `modeloPneu` | sim |
| `medida` | sim |
| `montadora` | sim |
| `modeloVeiculo` | sim |
| `versaoVeiculo` | não |
| `anoInicial` / `anoFinal` | não |
| `fonteUrl` | sim |
| `fonteNome` | sim |
| `tipoFonte` | sim — `MARKETPLACE` \| `DISTRIBUIDOR_OFICIAL` \| `FABRICANTE_PNEU` \| `MONTADORA` \| `MANUAL` \| `CATALOGO_OE` |
| `dataColeta` | não (AAAA-MM-DD, padrão hoje) |

## homologations/ → Homologation

Veículo e pneu original precisam já existir (`vehicles/` e `tire_sizes/`
importados antes). Nunca criada sem os dois já cadastrados.

| Coluna | Obrigatória |
|---|---|
| `marca` / `modelo` / `versao` | sim (veículo) |
| `pneuOriginalFabricante` / `pneuOriginalModelo` / `pneuOriginalMedida` | sim |
| `pneusOpcionais` | não — formato `fabricante\|modelo\|medida;fabricante2\|modelo2\|medida2` |
| `codigo` | sim |
| `anoModelo` / `anoFabricacao` | não |
| `observacoes` | não |

## oe_codes/ → OeCode

| Coluna | Obrigatória |
|---|---|
| `montadora` | sim — precisa já existir |
| `codigo` | sim |
| `descricao` | não |

## technologies/ → Technology

| Coluna | Obrigatória |
|---|---|
| `nome` | sim |
| `descricao` | não |

## countries/ → Country

| Coluna | Obrigatória |
|---|---|
| `isoCode` | sim |
| `nome` | sim |
| `regiao` | não |

## logs/

Não é lida por nenhum importador — os logs reais (arquivo, data/hora,
usuário, quantidade importada/atualizada/ignorada, erros, tempo) ficam em
`ImportBatch`/`ImportError` (tabela, não arquivo), consultáveis no
histórico de importações do painel administrativo. Esta pasta existe só
como local de referência/arquivamento manual de exports de log, se algum
dia for necessário.

## Ordem obrigatória (bloqueada, não apenas recomendada)

1. `countries` 2. `brands` 3. `tire_models` 4. `tire_sizes` 5. `vehicles`
6. `oe_codes` 7. `technologies` 8. `applications` 9. `homologations`

O importador **recusa** rodar a etapa N se a tabela da etapa N-1 estiver
vazia (nenhum registro real ainda) — a mensagem de erro diz exatamente
qual etapa precisa ser preenchida primeiro. Isso é adicional às
validações de existência dentro de cada linha (ex.: "modelo X não
encontrado") — é uma checagem de que a etapa anterior tem *algum* dado
antes de sequer tentar a atual.

## BrandPolicy — o que cada uma permite

| Política | Aplicações (`applications/`) | Homologações (`homologations/`) |
|---|---|---|
| `APPLICATION_ONLY` | ✅ | ❌ |
| `OEM_ONLY` | ❌ | ✅ |
| `OEM_AND_APPLICATION` | ✅ | ✅ |
| `HISTORICAL_ONLY` | ❌ | ❌ |

A política é lida do `TireManufacturer` do pneu envolvido em cada linha —
se a política não permitir, a linha vira erro (linha pulada, importação
continua), nunca um registro criado silenciosamente fora da política.
