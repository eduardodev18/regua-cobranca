// Modelos baseados no dicionário de dados da proposta (tabelas ZRC, ZRD, ZRH, ZRE, ZRG, ZRF)

export type TipoCliente = 'PF' | 'PJ' | 'Todos';
export type Canal = 'E-mail' | 'WhatsApp' | 'SMS' | 'Telefone' | 'Sistema';

/** ZRC - Cadastro de Réguas de Cobrança */
export interface Regua {
  codigo: string;         // ZRC_COD
  descricao: string;      // ZRC_DESC
  ativa: boolean;         // ZRC_ATIVO
  prioridade: number;     // ZRC_PRIORI
  dtInicio: string;       // ZRC_INICIO
  dtFim: string;          // ZRC_FIM
  tipoCliente: TipoCliente; // ZRC_TPCLI
  valorMin: number;       // ZRC_VLRMIN
  valorMax: number;       // ZRC_VLRMAX
  permiteJuridico: boolean; // ZRC_JURID
  permiteBloqueio: boolean; // ZRC_BLOQ
  observacoes?: string;   // ZRC_OBS
}

/** ZRD - Etapas da Régua */
export interface Etapa {
  regua: string;          // ZRD_REGUA
  seq: string;             // ZRD_SEQ
  descricao: string;       // (descritivo da etapa)
  diaRelativo: number;     // ZRD_DIA
  canal: Canal;             // ZRD_CANAL
  tipoAcao: string;         // ZRD_ACAO (código do tipo de ação padrão)
  template: string;         // ZRD_TPL
  horaIni: string;          // ZRD_HINI
  horaFim: string;          // ZRD_HFIM
  ativo: boolean;           // ZRD_ATIVO
}

/** ZRH - Ações dentro de uma Etapa */
export interface Acao {
  regua: string;        // ZRH_REGUA
  etapa: string;         // ZRH_SEQETA
  seqAcao: string;        // ZRH_SEQA
  descricao: string;      // descritivo da ação
  tipo: string;            // ZRH_TIPO (código do tipo de ação)
  template: string;        // ZRH_TPL
  prazo: string;            // ZRH_PRAZO (texto: "-", "24 horas", etc.)
  condicao: string;         // condição de disparo
  ativo: boolean;            // ZRH_ATIVO
}

/** ZRE - Templates de mensagem */
export interface MessageTemplate {
  codigo: string;      // ZRE_COD
  descricao: string;   // ZRE_DESC
  canal: Canal;          // ZRE_CANAL
  assunto?: string;      // ZRE_ASSUNT
  corpo: string;          // ZRE_CORPO
  ativo: boolean;         // ZRE_ATIVO
}

/** ZRG - Tipos de Ação (funções ADVPL) */
export interface TipoAcao {
  codigo: string;         // ZRG_COD
  descricao: string;      // ZRG_DESC
  canal: Canal | 'Sistema'; // ZRG_CANAL
  funcaoAdvpl: string;      // ZRG_EXEC
  requerTemplate: boolean;  // derivado de ZRG_TP / ZRG_PARAM
  ativo: boolean;
}

export type StatusExecucao = 'Sucesso' | 'Falha' | 'Tentativa' | 'Pendente';

/** ZRF - Histórico / Execuções */
export interface Execucao {
  id: number;
  dataHora: string;      // ZRF_DTHR
  regua: string;          // ZRF_REGUA
  etapa: string;           // ZRF_SEQETA
  acao: string;             // descrição da ação executada
  cliente: string;          // nome do cliente (mock)
  titulo: string;            // ZRF_PREFIX + ZRF_NUM / ZRF_PARC
  canal: Canal;
  status: StatusExecucao;
  resultado: string;         // ZRF_OBS / ZRF_RETORN resumido
  destino?: string;          // ZRF_DESTIN

  // Tabulação de atendimento (preenchida pelo atendente após tratar o contato, ex: uma ligação)
  observacoes?: string;      // anotações livres do atendente sobre o que foi tratado
  promessaData?: string;     // data prometida para pagamento, se houver
  promessaValor?: number;    // valor prometido, se houver
  tabuladoPor?: string;      // usuário que tabulou o atendimento
  tabuladoEm?: string;       // data/hora em que a tabulação foi feita
}

/** Opções padrão de resultado usadas ao tabular um atendimento (ex: pós-ligação) */
export const RESULTADO_TABULACAO_OPTIONS = [
  'Promessa de pagamento',
  'Cliente não atendeu',
  'Número errado / inexistente',
  'Recusa de pagamento',
  'Solicitou renegociação',
  'Contestação de débito',
  'Pagamento já efetuado',
  'Caixa postal / sem retorno',
  'Outro'
] as const;

export type StatusTitulo = 'Em aberto' | 'Pago' | 'Renegociado';

export const FILIAIS = ['Matriz - São Paulo', 'Filial - Rio de Janeiro', 'Filial - Belo Horizonte'] as const;
export const UNIDADES_NEGOCIO = ['Varejo', 'Atacado', 'Digital'] as const;
export const RESPONSAVEIS = ['Administrador', 'Fernanda Costa', 'Roberto Nunes', 'Camila Rocha'] as const;

/** Carteira de títulos em cobrança — base para os KPIs financeiros do Dashboard */
export interface TituloCarteira {
  id: number;
  cliente: string;
  titulo: string;
  regua: string;            // código da régua vinculada
  valor: number;             // valor original do título
  dataVencimento: string;    // dd/mm/aaaa
  status: StatusTitulo;
  dataPagamento?: string;    // preenchido quando status = 'Pago'
  valorPago?: number;        // preenchido quando status = 'Pago'
  filial: string;            // unidade/filial responsável pela cobrança
  unidadeNegocio: string;    // segmento de negócio do cliente
  responsavel: string;       // atendente/analista responsável pelo título
}

/** Filtros aplicáveis à carteira (usados no Dashboard e na tela de Carteira de Títulos) */
export interface CarteiraFiltro {
  periodoDe?: string;   // dd/mm/aaaa — filtra por vencimento OU pagamento dentro do período
  periodoAte?: string;
  filial?: string;      // 'todas' ou um valor de FILIAIS
  unidadeNegocio?: string; // 'todas' ou um valor de UNIDADES_NEGOCIO
  responsavel?: string; // 'todos' ou um valor de RESPONSAVEIS
  valorMin?: number;
  valorMax?: number;
  regua?: string;       // 'todas' ou código da régua
  status?: string;      // 'todos' | StatusTitulo
}
