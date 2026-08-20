# Pendências de API — Régua de Cobrança (retorno do front)

Documento de retorno após integrar o front (`wiz-regua-cobranca`) com o `API_REGUA_COBRANCA.md`
recebido. Lista o que já está consumindo a API real, o que ainda falta pra fechar o sistema, e
algumas confirmações sobre o que já existe.

---

## 1. O que já está integrado

Tipos de Ação (leitura), Templates (CRUD completo), Réguas de Cobrança (CRUD), Etapas da Régua
(CRUD), Ações extras da Etapa (CRUD) e Histórico (`collection-history`: consulta paginada por
cliente com filtros de régua/status + registro manual de contato) — todos batendo em
`/api/{code}/...` conforme documentado. Login também já está integrado (`/api/{code}/auth/login`,
multi-tenant pela URL).

Na tela de Histórico, o `codCliente` usado na consulta e no registro manual é digitado pelo
operador (não há busca por nome/autocomplete, porque ainda não existe um domínio de Clientes — ver
seção 2). Assim que esse domínio existir, dá pra trocar o campo por uma busca de cliente.

O que falta são dois domínios que não apareceram no `API_REGUA_COBRANCA.md`: **Clientes /
Fornecedores** e **Títulos a Receber (Carteira)**. Sem eles, as seguintes telas continuam com dados
mockados em memória: Dashboard, Relatórios, Carteira de Títulos, lista de Clientes e detalhe do
Cliente.

---

## 2. Clientes / Fornecedores

Precisamos de um cadastro de clientes para popular a lista de Clientes, os filtros de Carteira de
Títulos e Dashboard, e para trocar o campo de texto livre "Código do Cliente" da tela de Histórico
por uma busca de verdade (hoje o operador digita o `codCliente` manualmente).

Campos que as telas atuais já esperam (baseado no protótipo aprovado):

| Campo | Tipo | Observação |
|---|---|---|
| `codCliente` | string | Precisa ser o mesmo código aceito por `collection-history/{clientCode}` |
| `nome` | string | Nome/razão social |
| `cnpjCpf` | string | Sem máscara |
| `tipo` | `"F"` \| `"P"` | Pessoa Física / Jurídica (mesmo padrão de `tipoCliente` em collection-rules) |
| `filial` | string | Unidade/filial responsável pela cobrança |
| `unidadeNegocio` | string | Segmento de negócio do cliente |
| `responsavel` | string | Atendente/analista responsável |

Sugestão de rota, seguindo o padrão dos demais domínios: `GET /api/{code}/clients` (lista, com
paginação/busca) e `GET /api/{code}/clients/{codCliente}` (detalhe).

---

## 3. Títulos a Receber / Carteira

Base dos KPIs financeiros do Dashboard, da tela de Carteira de Títulos e do detalhe do Cliente
(débitos em aberto/pagos). Campos esperados:

| Campo | Tipo | Observação |
|---|---|---|
| `prefixo`, `numTitulo`, `parcela`, `tipoTitulo` | string | Mesma decomposição de título já usada em `collection-history` (seção 5 do doc original) — sugerimos reaproveitar |
| `codCliente` | string | Mesmo código do domínio de Clientes (seção 2) |
| `codRegua` | string | Régua vinculada ao título (já existe em `collection-rules`) |
| `valor` | number | Valor original do título |
| `dataVencimento` | DateTime ISO | |
| `status` | string | Em aberto / Pago / Renegociado (nomenclatura a definir com vocês) |
| `dataPagamento`, `valorPago` | DateTime ISO / number | Preenchidos quando pago |
| `filial`, `unidadeNegocio`, `responsavel` | string | Mesmos campos do domínio de Clientes — podem vir só por referência ao cliente, não precisa duplicar |

Sugestão de rota: `GET /api/{code}/receivables` (ou nome equivalente), com filtros por período,
cliente, régua, status, filial, unidade de negócio e responsável — os mesmos filtros que a tela de
Carteira de Títulos já usa hoje sobre os dados mockados.

---

## 4. Consequência direta: telas que destravam com esses dois domínios

- **Dashboard / Relatórios**: hoje calculam KPIs em cima de réguas e execuções mockadas: precisam
  passar a usar `collection-rules` (já real) + `collection-history` + o novo endpoint de títulos.
- **Carteira de Títulos** e **Clientes**: dependem diretamente da seção 3 e 2, respectivamente.

---

## 5. Confirmações sobre o que já existe (não bloqueia, mas ajuda a fechar loose ends)

- Os endpoints de mutação de etapas e ações extras (`POST`/`PUT`/`DELETE` em
  `collection-rules/.../steps` e `.../actions`) não têm o corpo de resposta documentado. O front
  hoje não depende do retorno (recarrega a lista depois de cada operação), mas ajuda confirmar se
  sempre respeitam o envelope `{ success, data, message }` mesmo quando não há dado relevante pra
  devolver.
- O campo `tipo` em `collection-action-types` (ex: `"COMUN"`) — o front só exibe, não usa pra
  nenhuma lógica hoje. O protótipo anterior tinha um campo `requerTemplate` (indicando se aquele
  tipo de ação exige template vinculado) que não existe na API real. Faz sentido esse dado vir de
  algum lugar (talvez derivado de `tipo`), ou o front deve sempre permitir template opcional?
- Nos exemplos recebidos, os canais vistos em `collection-action-types` foram só `EMAIL`, `WPP` e
  `SMS`. Existem outros canais cadastrados (ex: ligação telefônica, ação de sistema/ADVPL sem
  mensagem) que retornam por esse mesmo endpoint? O protótipo anterior tinha ações como "Aguardar",
  "Verificar Pagamento" e "Gerar Ocorrência" sem canal de mensagem — queremos saber se esse tipo de
  ação também vem daqui ou é tratado de outra forma pelo motor.

---

## 6. Referência — modelo usado hoje no front (mock)

Pra acelerar, os campos das seções 2 e 3 foram extraídos diretamente do modelo que a tela já usa
(`TituloCarteira` e a lista de clientes derivada dele) no protótipo aprovado. Qualquer ajuste de
nome/tipo de campo é tranquilo do lado do front — o que importa é fechar o formato o quanto antes
pra destravar Dashboard, Relatórios, Carteira e Clientes.
