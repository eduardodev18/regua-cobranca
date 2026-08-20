import { Injectable, signal, computed } from '@angular/core';
import {
  Regua, Etapa, Acao, MessageTemplate, TipoAcao, Execucao, Canal, StatusExecucao, TituloCarteira,
  FILIAIS, UNIDADES_NEGOCIO, RESPONSAVEIS
} from '../models';
import { HOJE, fmtData, addDias } from './carteira-calc';

function seedReguas(): Regua[] {
  return [
    { codigo: 'REG001', descricao: 'Régua Pessoa Física - Até 5k', ativa: true, prioridade: 10, dtInicio: '01/01/2026', dtFim: '31/12/2026', tipoCliente: 'PF', valorMin: 0, valorMax: 5000, permiteJuridico: true, permiteBloqueio: false, observacoes: 'Régua padrão para pessoa física com débitos de baixo valor.' },
    { codigo: 'REG002', descricao: 'Régua Pessoa Física - 5k a 20k', ativa: true, prioridade: 20, dtInicio: '01/01/2026', dtFim: '31/12/2026', tipoCliente: 'PF', valorMin: 5000.01, valorMax: 20000, permiteJuridico: true, permiteBloqueio: true, observacoes: 'Régua intermediária para pessoa física.' },
    { codigo: 'REG003', descricao: 'Régua Pessoa Jurídica', ativa: true, prioridade: 30, dtInicio: '01/01/2026', dtFim: '31/12/2026', tipoCliente: 'PJ', valorMin: 0, valorMax: 0, permiteJuridico: true, permiteBloqueio: true, observacoes: 'Régua padrão para clientes pessoa jurídica.' },
    { codigo: 'REG004', descricao: 'Régua Alta Complexidade', ativa: true, prioridade: 40, dtInicio: '01/01/2026', dtFim: '31/12/2026', tipoCliente: 'Todos', valorMin: 20000.01, valorMax: 0, permiteJuridico: true, permiteBloqueio: true, observacoes: 'Débitos de alto valor, todos os tipos de cliente.' },
    { codigo: 'REG005', descricao: 'Régua Teste', ativa: false, prioridade: 99, dtInicio: '01/01/2026', dtFim: '31/12/2026', tipoCliente: 'Todos', valorMin: 0, valorMax: 0, permiteJuridico: false, permiteBloqueio: false, observacoes: 'Ambiente de testes, não utilizar em produção.' },
  ];
}

function seedEtapas(): Etapa[] {
  return [
    { regua: 'REG001', seq: '001', descricao: 'Cobrança Inicial', diaRelativo: 0, canal: 'E-mail', tipoAcao: 'EMAIL', template: 'EMAIL001', horaIni: '08:00', horaFim: '20:00', ativo: true },
    { regua: 'REG001', seq: '002', descricao: 'Reforço por WhatsApp', diaRelativo: 5, canal: 'WhatsApp', tipoAcao: 'WPP', template: 'WPP001', horaIni: '09:00', horaFim: '20:00', ativo: true },
    { regua: 'REG001', seq: '003', descricao: 'Ligação Telefônica', diaRelativo: 15, canal: 'Telefone', tipoAcao: 'LIGACAO', template: 'LIG001', horaIni: '09:00', horaFim: '18:00', ativo: true },
    { regua: 'REG001', seq: '004', descricao: 'Nova Tentativa WhatsApp', diaRelativo: 25, canal: 'WhatsApp', tipoAcao: 'WPP', template: 'WPP002', horaIni: '09:00', horaFim: '20:00', ativo: true },
    { regua: 'REG001', seq: '005', descricao: 'Cobrança Jurídica', diaRelativo: 35, canal: 'Sistema', tipoAcao: 'OCORRENCIA', template: 'JUR001', horaIni: '07:00', horaFim: '18:00', ativo: true },

    { regua: 'REG002', seq: '001', descricao: 'Cobrança Inicial', diaRelativo: 0, canal: 'E-mail', tipoAcao: 'EMAIL', template: 'EMAIL001', horaIni: '08:00', horaFim: '20:00', ativo: true },
    { regua: 'REG002', seq: '002', descricao: 'Lembrete WhatsApp', diaRelativo: 7, canal: 'WhatsApp', tipoAcao: 'WPP', template: 'WPP002', horaIni: '09:00', horaFim: '20:00', ativo: true },
    { regua: 'REG002', seq: '003', descricao: 'Ligação de Cobrança', diaRelativo: 20, canal: 'Telefone', tipoAcao: 'LIGACAO', template: 'LIG001', horaIni: '09:00', horaFim: '18:00', ativo: true },

    { regua: 'REG003', seq: '001', descricao: 'Cobrança Inicial PJ', diaRelativo: 0, canal: 'E-mail', tipoAcao: 'EMAIL', template: 'EMAIL002', horaIni: '08:00', horaFim: '18:00', ativo: true },
    { regua: 'REG003', seq: '002', descricao: 'Contato Comercial', diaRelativo: 10, canal: 'Telefone', tipoAcao: 'LIGACAO', template: 'LIG001', horaIni: '09:00', horaFim: '18:00', ativo: true },

    { regua: 'REG004', seq: '001', descricao: 'Notificação Formal', diaRelativo: 0, canal: 'E-mail', tipoAcao: 'EMAIL', template: 'EMAIL002', horaIni: '08:00', horaFim: '18:00', ativo: true },
    { regua: 'REG004', seq: '002', descricao: 'Encaminhamento Jurídico', diaRelativo: 10, canal: 'Sistema', tipoAcao: 'OCORRENCIA', template: 'JUR001', horaIni: '07:00', horaFim: '18:00', ativo: true },

    { regua: 'REG005', seq: '001', descricao: 'Etapa de Teste', diaRelativo: 0, canal: 'Sistema', tipoAcao: 'EXECADVPL', template: '-', horaIni: '00:00', horaFim: '23:59', ativo: false },
  ];
}

function seedAcoes(): Acao[] {
  return [
    { regua: 'REG001', etapa: '002', seqAcao: '001', descricao: 'Enviar WhatsApp de Cobrança', tipo: 'WPP', template: 'WPP001', prazo: '-', condicao: 'Sempre', ativo: true },
    { regua: 'REG001', etapa: '002', seqAcao: '002', descricao: 'Aguardar Resposta', tipo: 'AGUARDAR', template: '-', prazo: '24 horas', condicao: 'Aguardar resposta', ativo: true },
    { regua: 'REG001', etapa: '002', seqAcao: '003', descricao: 'Verificar Pagamento', tipo: 'VERPAGTO', template: '-', prazo: '-', condicao: 'Após etapa anterior', ativo: true },
    { regua: 'REG001', etapa: '002', seqAcao: '004', descricao: 'Enviar 2º WhatsApp (Lembrete)', tipo: 'WPP', template: 'WPP002', prazo: '-', condicao: 'Se não pago', ativo: true },
    { regua: 'REG001', etapa: '002', seqAcao: '005', descricao: 'Encerrar Etapa', tipo: 'EXECADVPL', template: '-', prazo: '-', condicao: 'Sempre', ativo: true },

    { regua: 'REG001', etapa: '001', seqAcao: '001', descricao: 'Enviar E-mail de Cobrança', tipo: 'EMAIL', template: 'EMAIL001', prazo: '-', condicao: 'Sempre', ativo: true },
    { regua: 'REG001', etapa: '001', seqAcao: '002', descricao: 'Verificar Pagamento', tipo: 'VERPAGTO', template: '-', prazo: '48 horas', condicao: 'Após envio', ativo: true },

    { regua: 'REG001', etapa: '003', seqAcao: '001', descricao: 'Realizar Ligação', tipo: 'LIGACAO', template: 'LIG001', prazo: '-', condicao: 'Sempre', ativo: true },
    { regua: 'REG001', etapa: '003', seqAcao: '002', descricao: 'Registrar Ocorrência', tipo: 'OCORRENCIA', template: '-', prazo: '-', condicao: 'Após ligação', ativo: true },
  ];
}

function seedTemplates(): MessageTemplate[] {
  return [
    { codigo: 'EMAIL001', descricao: 'E-mail Cobrança Inicial', canal: 'E-mail', assunto: 'Pendência Financeira - {{cliente}}', corpo: 'Olá {{cliente}}, identificamos uma pendência financeira em seu nome referente ao título {{titulo}}, no valor de {{valor}}. Regularize o quanto antes para evitar transtornos.', ativo: true },
    { codigo: 'EMAIL002', descricao: 'E-mail Segunda Cobrança', canal: 'E-mail', assunto: 'Lembrete de Pagamento - {{cliente}}', corpo: 'Olá {{cliente}}, este é um lembrete referente ao título {{titulo}} em aberto. Entre em contato para regularizar sua situação.', ativo: true },
    { codigo: 'WPP001', descricao: 'WhatsApp Cobrança', canal: 'WhatsApp', assunto: '', corpo: '👋 Olá {{cliente}}, tudo bem? Identificamos uma pendência no valor de {{valor}}. Podemos te ajudar a regularizar?', ativo: true },
    { codigo: 'WPP002', descricao: 'WhatsApp Lembrete', canal: 'WhatsApp', assunto: '', corpo: '⚠️ Lembrete de Pagamento: o título {{titulo}} continua em aberto. Fale conosco para negociar.', ativo: true },
    { codigo: 'SMS001', descricao: 'SMS Cobrança', canal: 'SMS', assunto: '', corpo: 'Pagamento em aberto: {{valor}}. Info: 0800-000-0000', ativo: true },
  ];
}

function seedTiposAcao(): TipoAcao[] {
  return [
    { codigo: 'EMAIL', descricao: 'Enviar E-mail', canal: 'E-mail', funcaoAdvpl: 'ZR_ENVIAEMAIL()', requerTemplate: true, ativo: true },
    { codigo: 'WPP', descricao: 'Enviar WhatsApp', canal: 'WhatsApp', funcaoAdvpl: 'ZR_ENVIAWPP()', requerTemplate: true, ativo: true },
    { codigo: 'SMS', descricao: 'Enviar SMS', canal: 'SMS', funcaoAdvpl: 'ZR_ENVIASMS()', requerTemplate: true, ativo: true },
    { codigo: 'LIGACAO', descricao: 'Ligação Telefônica', canal: 'Telefone', funcaoAdvpl: 'ZR_LIGACAO()', requerTemplate: false, ativo: true },
    { codigo: 'AGUARDAR', descricao: 'Aguardar', canal: 'Sistema', funcaoAdvpl: 'ZR_AGUARDAR()', requerTemplate: false, ativo: true },
    { codigo: 'VERPAGTO', descricao: 'Verificar Pagamento', canal: 'Sistema', funcaoAdvpl: 'ZR_VERPAGTO()', requerTemplate: false, ativo: true },
    { codigo: 'OCORRENCIA', descricao: 'Gerar Ocorrência', canal: 'Sistema', funcaoAdvpl: 'ZR_GERAOCOR()', requerTemplate: false, ativo: true },
    { codigo: 'EXECADVPL', descricao: 'Executar ADVPL', canal: 'Sistema', funcaoAdvpl: 'ZR_EXECADVPL()', requerTemplate: false, ativo: true },
  ];
}

const NOMES = ['João da Silva', 'Maria Souza', 'Empresa ABC Ltda', 'Carlos Lima', 'Ana Pereira', 'Fernanda Costa', 'Pedro Henrique', 'Comércio XPTO ME', 'Juliana Alves', 'Roberto Nunes', 'Camila Rocha', 'Distribuidora Sul Ltda', 'Lucas Martins', 'Patrícia Gomes', 'Bruno Cardoso'];
const CANAIS: { canal: Canal; acao: string; tipo: string }[] = [
  { canal: 'E-mail', acao: 'Enviar E-mail', tipo: 'EMAIL001' },
  { canal: 'WhatsApp', acao: 'Enviar WhatsApp', tipo: 'WPP001' },
  { canal: 'Telefone', acao: 'Ligação Telefônica', tipo: 'LIG001' },
  { canal: 'Sistema', acao: 'Gerar Ocorrência', tipo: 'JUR001' },
  { canal: 'SMS', acao: 'Enviar SMS', tipo: 'SMS001' },
];
const STATUS_POOL: { status: StatusExecucao; resultado: string }[] = [
  { status: 'Sucesso', resultado: 'Mensagem enviada' },
  { status: 'Sucesso', resultado: 'E-mail entregue' },
  { status: 'Sucesso', resultado: 'Ocorrência criada' },
  { status: 'Tentativa', resultado: 'Sem atendimento' },
  { status: 'Falha', resultado: 'Número inválido' },
  { status: 'Falha', resultado: 'E-mail rejeitado' },
  { status: 'Pendente', resultado: 'Aguardando envio' },
];
const REGUAS_POOL = ['REG001', 'REG002', 'REG003', 'REG004'];
const ETAPAS_POOL = ['001', '002', '003', '004', '005'];

function seedExecucoes(): Execucao[] {
  const fixas: Execucao[] = [
    { id: 1, dataHora: '31/05/2025 10:15:23', regua: 'REG001', etapa: '002', acao: 'Enviar WhatsApp', cliente: 'João da Silva', titulo: '123456/01', canal: 'WhatsApp', status: 'Sucesso', resultado: 'Mensagem enviada', destino: '(11) 98888-1234' },
    { id: 2, dataHora: '31/05/2025 10:10:15', regua: 'REG001', etapa: '001', acao: 'Enviar E-mail', cliente: 'Maria Souza', titulo: '123456/02', canal: 'E-mail', status: 'Sucesso', resultado: 'E-mail entregue', destino: 'maria.souza@email.com' },
    { id: 3, dataHora: '31/05/2025 09:58:10', regua: 'REG003', etapa: '003', acao: 'Ligação Telefônica', cliente: 'Empresa ABC Ltda', titulo: '987654/01', canal: 'Telefone', status: 'Tentativa', resultado: 'Sem atendimento', destino: '(11) 3333-4444' },
    { id: 4, dataHora: '31/05/2025 09:45:33', regua: 'REG002', etapa: '004', acao: 'Enviar WhatsApp', cliente: 'Carlos Lima', titulo: '456123/01', canal: 'WhatsApp', status: 'Falha', resultado: 'Número inválido', destino: '(11) 90000-0000' },
    { id: 5, dataHora: '31/05/2025 08:30:05', regua: 'REG001', etapa: '005', acao: 'Gerar Ocorrência', cliente: 'Ana Pereira', titulo: '789456/02', canal: 'Sistema', status: 'Sucesso', resultado: 'Ocorrência criada', destino: '-' },
    {
      id: 6, dataHora: '31/05/2025 08:05:47', regua: 'REG001', etapa: '003', acao: 'Ligação Telefônica', cliente: 'Fernanda Costa', titulo: '654321/01', canal: 'Telefone', status: 'Sucesso', resultado: 'Promessa de pagamento', destino: '(11) 97777-2222',
      observacoes: 'Cliente atendeu, informou que o atraso foi por esquecimento e se comprometeu a pagar o boleto atualizado.',
      promessaData: '05/06/2025', promessaValor: 480, tabuladoPor: 'Administrador', tabuladoEm: '31/05/2025 08:09:12'
    },
  ];

  const geradas: Execucao[] = [];
  let id = 7;
  for (let d = 0; d < 51; d++) {
    const day = 31 - (d % 28);
    const month = d < 28 ? '05' : '04';
    for (let i = 0; i < 5; i++) {
      const nome = NOMES[(d * 5 + i) % NOMES.length];
      const chan = CANAIS[(d + i) % CANAIS.length];
      const st = STATUS_POOL[(d * 3 + i) % STATUS_POOL.length];
      const regua = REGUAS_POOL[(d + i) % REGUAS_POOL.length];
      const etapa = ETAPAS_POOL[(d + i * 2) % ETAPAS_POOL.length];
      const hh = String(7 + ((d + i) % 12)).padStart(2, '0');
      const mm = String((d * 7 + i * 13) % 60).padStart(2, '0');
      const ss = String((d * 3 + i * 17) % 60).padStart(2, '0');
      geradas.push({
        id: id++,
        dataHora: `${String(Math.max(1, day)).padStart(2, '0')}/${month}/2025 ${hh}:${mm}:${ss}`,
        regua,
        etapa,
        acao: chan.acao,
        cliente: nome,
        titulo: `${100000 + (d * 5 + i) * 7}/0${(i % 3) + 1}`,
        canal: chan.canal,
        status: st.status,
        resultado: st.resultado,
        destino: chan.canal === 'E-mail' ? `${nome.split(' ')[0].toLowerCase()}@email.com` : chan.canal === 'WhatsApp' ? '(11) 9' + (7000 + d) + '-' + (1000 + i) : '-'
      });
    }
  }
  return [...fixas, ...geradas];
}

function seedCarteira(): TituloCarteira[] {
  const clientesPF = ['João da Silva', 'Maria Souza', 'Carlos Lima', 'Ana Pereira', 'Fernanda Costa', 'Pedro Henrique', 'Juliana Alves', 'Roberto Nunes', 'Camila Rocha', 'Lucas Martins', 'Patrícia Gomes', 'Bruno Cardoso', 'Rafael Teixeira', 'Larissa Fonseca', 'Gustavo Ramos'];
  const clientesPJ = ['Empresa ABC Ltda', 'Comércio XPTO ME', 'Distribuidora Sul Ltda', 'Mercado Boa Vista Ltda', 'Construtora Horizonte SA'];

  // Padrão de dias em relação a "hoje" (negativo = vencido, positivo = a vencer) e status,
  // repetido/deslocado para cobrir todas as faixas de aging e alguns pagamentos recentes.
  const padrao: { offset: number; status: 'Em aberto' | 'Pago' }[] = [
    { offset: 20, status: 'Em aberto' },   // a vencer
    { offset: 8, status: 'Em aberto' },    // a vencer
    { offset: -6, status: 'Em aberto' },   // 1-30
    { offset: -18, status: 'Em aberto' },  // 1-30
    { offset: -27, status: 'Em aberto' },  // 1-30
    { offset: -40, status: 'Em aberto' },  // 31-60
    { offset: -52, status: 'Em aberto' },  // 31-60
    { offset: -70, status: 'Em aberto' },  // 61-90
    { offset: -85, status: 'Em aberto' },  // 61-90
    { offset: -100, status: 'Em aberto' }, // 90+
    { offset: -140, status: 'Em aberto' }, // 90+
    { offset: -180, status: 'Em aberto' }, // 90+
    { offset: -4, status: 'Pago' },        // recuperado no período
    { offset: -12, status: 'Pago' },       // recuperado no período
    { offset: -22, status: 'Pago' },       // recuperado no período
  ];

  const titulos: TituloCarteira[] = [];
  let id = 1;

  for (let i = 0; i < 96; i++) {
    const isPJ = i % 6 === 0;
    const cliente = isPJ ? clientesPJ[i % clientesPJ.length] : clientesPF[i % clientesPF.length];
    const valor = Math.round((isPJ ? 3200 + ((i * 733) % 22000) : 180 + ((i * 317) % 6200)) * 100) / 100;

    // Régua atribuída pela mesma lógica de faixa de valor/tipo de cliente usada no cadastro de réguas
    const regua = isPJ ? 'REG003' : (valor <= 5000 ? 'REG001' : valor <= 20000 ? 'REG002' : 'REG004');

    const p = padrao[i % padrao.length];
    const vencimento = addDias(HOJE, p.offset);

    const titulo: TituloCarteira = {
      id: id++,
      cliente,
      titulo: `${100000 + i * 11}/0${(i % 3) + 1}`,
      regua,
      valor,
      dataVencimento: fmtData(vencimento),
      status: p.status,
      filial: FILIAIS[i % FILIAIS.length],
      unidadeNegocio: UNIDADES_NEGOCIO[i % UNIDADES_NEGOCIO.length],
      responsavel: RESPONSAVEIS[i % RESPONSAVEIS.length],
    };

    if (p.status === 'Pago') {
      const pagamento = addDias(vencimento, 2 + (i % 5));
      titulo.dataPagamento = fmtData(pagamento);
      titulo.valorPago = valor;
    }

    titulos.push(titulo);
  }

  return titulos;
}

/**
 * ⚠️ MOCK — dados em memória, não vêm mais da API real na maior parte do app.
 *
 * As telas de Réguas, Etapas, Ações extras, Templates e Tipos de Ação JÁ FORAM migradas
 * pra API real (ver CollectionRulesService, CollectionTemplatesService,
 * CollectionActionTypesService) e não usam mais este serviço.
 *
 * A tela de Histórico também JÁ FOI migrada pra API real (ver CollectionHistoryService,
 * seção 5 do API_REGUA_COBRANCA.md — consulta paginada por cliente + registro manual de
 * contato) e não usa mais `execucoes` deste mock.
 *
 * Continuam dependendo deste mock, porque a API ainda não cobre Clientes/Fornecedores
 * nem Títulos a Receber (ver PENDENCIAS_BACKEND.md):
 *   - `carteira` (Títulos)      → dashboard, relatórios, carteira de títulos, clientes
 *   - `execucoes`               → dashboard, relatórios (ainda usados só nesses dois)
 *   - `kpis` / `motorStatus`    → dashboard (calculados em cima de carteira/execuções mock)
 *
 * IMPORTANTE: `reguas`/`etapas`/`acoes`/`templates`/`tiposAcao` deste serviço são dados
 * de SEED, desconectados da API real. O Dashboard e os Relatórios ainda leem réguas e
 * etapas daqui (porque cruzam com carteira/execuções, que são mock) — ou seja, criar ou
 * editar uma régua de verdade na tela de Réguas NÃO aparece no Dashboard/Relatórios
 * ainda. Isso só se resolve integrando Clientes/Títulos e então recalculando essas
 * telas a partir da API real também.
 */
@Injectable({ providedIn: 'root' })
export class MockDataService {
  private _reguas = signal<Regua[]>(seedReguas());
  private _etapas = signal<Etapa[]>(seedEtapas());
  private _acoes = signal<Acao[]>(seedAcoes());
  private _templates = signal<MessageTemplate[]>(seedTemplates());
  private _tiposAcao = signal<TipoAcao[]>(seedTiposAcao());
  private _execucoes = signal<Execucao[]>(seedExecucoes());
  private _carteira = signal<TituloCarteira[]>(seedCarteira());

  readonly reguas = this._reguas.asReadonly();
  readonly etapas = this._etapas.asReadonly();
  readonly acoes = this._acoes.asReadonly();
  readonly templates = this._templates.asReadonly();
  readonly tiposAcao = this._tiposAcao.asReadonly();
  readonly execucoes = this._execucoes.asReadonly();
  readonly carteira = this._carteira.asReadonly();

  readonly kpis = computed(() => {
    const reguas = this._reguas();
    const exec = this._execucoes();
    const hoje = exec.filter(e => e.dataHora.startsWith('31/05/2025'));
    const sucesso = exec.filter(e => e.status === 'Sucesso').length;
    return {
      reguasAtivas: reguas.filter(r => r.ativa).length,
      totalReguas: reguas.length,
      execucoesHoje: hoje.length,
      totalExecucoes: exec.length,
      taxaSucesso: exec.length ? Math.round((sucesso / exec.length) * 1000) / 10 : 0,
      clientesEmCobranca: new Set(exec.map(e => e.cliente)).size,
    };
  });

  /** Período padrão considerado para "valor recuperado" quando não há filtro de período (dias corridos antes de "hoje") */
  readonly PERIODO_DIAS_PADRAO = 30;

  /** Painel operacional do motor de cobrança (jobs, fila, integração com o ERP) */
  readonly motorStatus = computed(() => {
    const exec = this._execucoes();
    const hoje = exec.filter(e => e.dataHora.startsWith('31/05/2025'));
    const executadasHoje = hoje.filter(e => e.status !== 'Pendente').length;
    // "atrasadas" = execuções que ficaram paradas em 'Pendente' e já deveriam ter sido processadas
    // (considera toda a base, não só hoje — é isso que hoje o dashboard não mostra)
    const atrasadas = exec.filter(e => e.status === 'Pendente').length;
    const agendadasHoje = hoje.length + 6; // inclui disparos ainda não processados pelo job de hoje
    const errosIntegracao = 3;
    const tamanhoFila = 27;

    let statusGeral: 'ok' | 'atencao' | 'critico' = 'ok';
    if (atrasadas > 20 || errosIntegracao > 8) statusGeral = 'critico';
    else if (atrasadas > 0 || errosIntegracao > 0) statusGeral = 'atencao';

    return {
      agendadasHoje,
      executadasHoje,
      atrasadas,
      errosIntegracao,
      tamanhoFila,
      ultimaSincronizacaoProtheus: '31/05/2025 06:02',
      minutosDesdeSincronizacao: 222, // ~3h42 — usado só para exibição no mock
      statusGeral,
    };
  });

  // ---------- Réguas ----------
  getRegua(codigo: string) {
    return this._reguas().find(r => r.codigo === codigo);
  }

  nextReguaCodigo() {
    const n = this._reguas().length + 1;
    return 'REG' + String(n).padStart(3, '0');
  }

  addRegua(regua: Regua) {
    this._reguas.update(list => [...list, regua]);
  }

  updateRegua(codigo: string, changes: Partial<Regua>) {
    this._reguas.update(list => list.map(r => r.codigo === codigo ? { ...r, ...changes } : r));
  }

  deleteRegua(codigo: string) {
    this._reguas.update(list => list.filter(r => r.codigo !== codigo));
  }

  toggleReguaAtiva(codigo: string) {
    this._reguas.update(list => list.map(r => r.codigo === codigo ? { ...r, ativa: !r.ativa } : r));
  }

  // ---------- Etapas ----------
  getEtapasByRegua(regua: string) {
    return this._etapas().filter(e => e.regua === regua).sort((a, b) => a.seq.localeCompare(b.seq));
  }

  getEtapa(regua: string, seq: string) {
    return this._etapas().find(e => e.regua === regua && e.seq === seq);
  }

  nextEtapaSeq(regua: string) {
    const n = this.getEtapasByRegua(regua).length + 1;
    return String(n).padStart(3, '0');
  }

  addEtapa(etapa: Etapa) {
    this._etapas.update(list => [...list, etapa]);
  }

  updateEtapa(regua: string, seq: string, changes: Partial<Etapa>) {
    this._etapas.update(list => list.map(e => (e.regua === regua && e.seq === seq) ? { ...e, ...changes } : e));
  }

  deleteEtapa(regua: string, seq: string) {
    this._etapas.update(list => list.filter(e => !(e.regua === regua && e.seq === seq)));
  }

  // ---------- Ações ----------
  getAcoesByEtapa(regua: string, etapa: string) {
    return this._acoes().filter(a => a.regua === regua && a.etapa === etapa).sort((a, b) => a.seqAcao.localeCompare(b.seqAcao));
  }

  nextAcaoSeq(regua: string, etapa: string) {
    const n = this.getAcoesByEtapa(regua, etapa).length + 1;
    return String(n).padStart(3, '0');
  }

  addAcao(acao: Acao) {
    this._acoes.update(list => [...list, acao]);
  }

  updateAcao(regua: string, etapa: string, seqAcao: string, changes: Partial<Acao>) {
    this._acoes.update(list => list.map(a => (a.regua === regua && a.etapa === etapa && a.seqAcao === seqAcao) ? { ...a, ...changes } : a));
  }

  deleteAcao(regua: string, etapa: string, seqAcao: string) {
    this._acoes.update(list => list.filter(a => !(a.regua === regua && a.etapa === etapa && a.seqAcao === seqAcao)));
  }

  // ---------- Templates ----------
  nextTemplateCodigo(canal: Canal) {
    const prefix = canal === 'E-mail' ? 'EMAIL' : canal === 'WhatsApp' ? 'WPP' : canal === 'SMS' ? 'SMS' : 'TPL';
    const count = this._templates().filter(t => t.codigo.startsWith(prefix)).length + 1;
    return prefix + String(count).padStart(3, '0');
  }

  addTemplate(template: MessageTemplate) {
    this._templates.update(list => [...list, template]);
  }

  updateTemplate(codigo: string, changes: Partial<MessageTemplate>) {
    this._templates.update(list => list.map(t => t.codigo === codigo ? { ...t, ...changes } : t));
  }

  deleteTemplate(codigo: string) {
    this._templates.update(list => list.filter(t => t.codigo !== codigo));
  }

  // ---------- Tipos de Ação ----------
  addTipoAcao(tipo: TipoAcao) {
    this._tiposAcao.update(list => [...list, tipo]);
  }

  updateTipoAcao(codigo: string, changes: Partial<TipoAcao>) {
    this._tiposAcao.update(list => list.map(t => t.codigo === codigo ? { ...t, ...changes } : t));
  }

  deleteTipoAcao(codigo: string) {
    this._tiposAcao.update(list => list.filter(t => t.codigo !== codigo));
  }

  // ---------- Histórico / Execuções ----------
  nextExecucaoId() {
    return this._execucoes().reduce((max, e) => Math.max(max, e.id), 0) + 1;
  }

  addExecucao(execucao: Execucao) {
    this._execucoes.update(list => [execucao, ...list]);
  }

  updateExecucao(id: number, changes: Partial<Execucao>) {
    this._execucoes.update(list => list.map(e => e.id === id ? { ...e, ...changes } : e));
  }

  deleteExecucao(id: number) {
    this._execucoes.update(list => list.filter(e => e.id !== id));
  }
}
