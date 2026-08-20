# NEXA | Régua de Cobrança (Protótipo Mock)

Projeto Angular standalone criado para **apresentação** da proposta de Régua de Cobrança. Todos os dados e fluxos são **mockados em memória** (sem backend/API real) — ideal para demonstrar o produto sem depender de integrações.

Baseado em:
- `Proposta_Regua_Cobranca_Documentacao_Completa.pdf` (dicionário de dados ZRC/ZRD/ZRH/ZRE/ZRG/ZRF)
- `Exemplo_Cadastro_Regua_Cobranca.xlsx` (exemplos de cadastro)
- Referências visuais das telas (Dashboard, Réguas, Etapas, Ações, Templates, Tipos de Ação, Histórico)

## Como rodar

```bash
npm install
npm start
```

Acesse `http://localhost:4200`.

## Estrutura

- `src/app/core/models` — modelos de dados (Régua, Etapa, Ação, Template, Tipo de Ação, Execução)
- `src/app/core/services/mock-data.service.ts` — dados mockados + CRUD em memória (Angular signals)
- `src/app/layout/shell` — sidebar + topbar (layout principal)
- `src/app/features/*` — telas: dashboard, reguas, etapas, acoes, templates, tipos-acao, historico, relatorios, configuracoes

## Fluxo de navegação

```
Dashboard
Réguas de Cobrança
 ├─ Cadastrar Réguas        (/reguas)
 ├─ Etapas da Régua         (/reguas/:codigo/etapas)
 ├─ Ações da Etapa          (/reguas/:codigo/etapas/:seq/acoes)
 ├─ Templates               (/templates)
 ├─ Tipos de Ação           (/tipos-acao)
 └─ Histórico / Execuções   (/historico)
Relatórios                  (/relatorios)
Configurações               (/configuracoes)
```

Todas as operações de criar/editar/excluir atualizam apenas o estado em memória do navegador (recarregar a página restaura os dados de exemplo).
