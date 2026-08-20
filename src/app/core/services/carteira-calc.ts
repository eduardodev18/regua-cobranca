import { CarteiraFiltro, Execucao, Regua, TituloCarteira } from '../models';

/** Data de referência usada como "hoje" em todo o mock (mesmo dia usado no histórico de execuções) */
export const HOJE = new Date(2025, 4, 31);

export function fmtData(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function parseData(s: string): Date {
  const [d, m, y] = s.split('/').map(Number);
  return new Date(y, m - 1, d);
}

export function addDias(base: Date, dias: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}

export function diasEntre(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

/** Aplica os filtros da carteira (período, filial, unidade de negócio, responsável, faixa de valor, régua, status) */
export function filtrarTitulos(titulos: TituloCarteira[], f: CarteiraFiltro): TituloCarteira[] {
  const de = f.periodoDe ? parseData(f.periodoDe).getTime() : NaN;
  const ate = f.periodoAte ? parseData(f.periodoAte).getTime() + 86_400_000 - 1 : NaN;

  return titulos.filter(t => {
    if (f.filial && f.filial !== 'todas' && t.filial !== f.filial) return false;
    if (f.unidadeNegocio && f.unidadeNegocio !== 'todas' && t.unidadeNegocio !== f.unidadeNegocio) return false;
    if (f.responsavel && f.responsavel !== 'todos' && t.responsavel !== f.responsavel) return false;
    if (f.regua && f.regua !== 'todas' && t.regua !== f.regua) return false;
    if (f.status && f.status !== 'todos' && t.status !== f.status) return false;
    if (f.valorMin != null && t.valor < f.valorMin) return false;
    if (f.valorMax != null && f.valorMax > 0 && t.valor > f.valorMax) return false;

    if (!isNaN(de) || !isNaN(ate)) {
      // considera o título dentro do período se seu vencimento OU pagamento cair no intervalo
      const refs = [parseData(t.dataVencimento).getTime(), t.dataPagamento ? parseData(t.dataPagamento).getTime() : NaN]
        .filter(n => !isNaN(n));
      const dentro = refs.some(ref => (isNaN(de) || ref >= de) && (isNaN(ate) || ref <= ate));
      if (!dentro) return false;
    }
    return true;
  });
}

export interface CarteiraKpis {
  carteiraEmAberto: number;
  valorRecuperado: number;
  percentualRecuperado: number;
  quantidadeClientes: number;
  totalTitulosAbertos: number;
  periodoDias: number;
  aging: {
    aVencer: { valor: number; qtd: number };
    d1_30: { valor: number; qtd: number };
    d31_60: { valor: number; qtd: number };
    d61_90: { valor: number; qtd: number };
    d90mais: { valor: number; qtd: number };
  };
}

export type AgingBucket = 'aVencer' | 'd1_30' | 'd31_60' | 'd61_90' | 'd90mais';

export const AGING_LABELS: Record<AgingBucket, string> = {
  aVencer: 'A vencer',
  d1_30: '1 - 30 dias',
  d31_60: '31 - 60 dias',
  d61_90: '61 - 90 dias',
  d90mais: '90+ dias',
};

/** Faixa de aging de um título em aberto (null se já pago/renegociado) */
export function agingBucketDe(t: TituloCarteira): AgingBucket | null {
  if (t.status !== 'Em aberto') return null;
  const diasVencido = diasEntre(HOJE, parseData(t.dataVencimento));
  if (diasVencido < 0) return 'aVencer';
  if (diasVencido <= 30) return 'd1_30';
  if (diasVencido <= 60) return 'd31_60';
  if (diasVencido <= 90) return 'd61_90';
  return 'd90mais';
}

/** Calcula os KPIs financeiros (carteira em aberto, valor recuperado, aging...) para um conjunto de títulos */
export function computeCarteiraKpis(titulos: TituloCarteira[], periodoDias = 30): CarteiraKpis {
  const abertos = titulos.filter(t => t.status === 'Em aberto');
  const pagos = titulos.filter(t => t.status === 'Pago');

  const carteiraEmAberto = abertos.reduce((s, t) => s + t.valor, 0);

  const recuperadosNoPeriodo = pagos.filter(t => {
    if (!t.dataPagamento) return false;
    const dias = diasEntre(HOJE, parseData(t.dataPagamento));
    return dias >= 0 && dias <= periodoDias;
  });
  const valorRecuperado = recuperadosNoPeriodo.reduce((s, t) => s + (t.valorPago ?? t.valor), 0);
  const baseComparacao = carteiraEmAberto + valorRecuperado;
  const percentualRecuperado = baseComparacao ? Math.round((valorRecuperado / baseComparacao) * 1000) / 10 : 0;

  const aging: CarteiraKpis['aging'] = {
    aVencer: { valor: 0, qtd: 0 },
    d1_30: { valor: 0, qtd: 0 },
    d31_60: { valor: 0, qtd: 0 },
    d61_90: { valor: 0, qtd: 0 },
    d90mais: { valor: 0, qtd: 0 },
  };

  for (const t of abertos) {
    const bucket = agingBucketDe(t);
    if (!bucket) continue;
    aging[bucket].valor += t.valor;
    aging[bucket].qtd += 1;
  }

  return {
    carteiraEmAberto,
    valorRecuperado,
    percentualRecuperado,
    quantidadeClientes: new Set(abertos.map(t => t.cliente)).size,
    totalTitulosAbertos: abertos.length,
    periodoDias,
    aging,
  };
}

/** Filtra execuções cujo dataHora caia dentro do período informado (dd/mm/aaaa) */
export function filtrarExecucoesPorPeriodo(execucoes: Execucao[], periodoDe?: string, periodoAte?: string): Execucao[] {
  const de = periodoDe ? parseData(periodoDe).getTime() : NaN;
  const ate = periodoAte ? parseData(periodoAte).getTime() + 86_400_000 - 1 : NaN;
  if (isNaN(de) && isNaN(ate)) return execucoes;
  return execucoes.filter(e => {
    const t = parseData(e.dataHora.split(' ')[0]).getTime();
    return (isNaN(de) || t >= de) && (isNaN(ate) || t <= ate);
  });
}

export interface FunilEtapa {
  etapa: string;
  valor: number;
  pctDoTopo: number;
  pctDoAnterior: number;
}

/** Funil de Cobrança: disparos -> entregues -> contato efetivo -> promessa de pagamento -> pagamento */
export function computeFunil(execucoes: Execucao[], titulos: TituloCarteira[]): FunilEtapa[] {
  const disparos = execucoes.length;
  const entregues = execucoes.filter(e => e.status !== 'Falha').length;
  const contatoEfetivo = execucoes.filter(e => e.status === 'Sucesso').length;

  const abertos = titulos.filter(t => t.status === 'Em aberto').length;
  const pagos = titulos.filter(t => t.status === 'Pago').length;
  // aproximação: títulos pagos sempre tiveram promessa; parte da carteira aberta também já prometeu e ainda não pagou
  const promessaPagamento = pagos + Math.round(abertos * 0.15);
  const pagamento = pagos;

  const etapas = [
    { etapa: 'Disparos', valor: disparos },
    { etapa: 'Entregues', valor: entregues },
    { etapa: 'Contato Efetivo', valor: contatoEfetivo },
    { etapa: 'Promessa de Pagamento', valor: promessaPagamento },
    { etapa: 'Pagamento', valor: pagamento },
  ];

  return etapas.map((e, i) => ({
    ...e,
    pctDoTopo: disparos ? Math.round((e.valor / disparos) * 1000) / 10 : 0,
    pctDoAnterior: i > 0 && etapas[i - 1].valor ? Math.round((e.valor / etapas[i - 1].valor) * 1000) / 10 : 100,
  }));
}

export interface EfetividadeRegua {
  codigo: string;
  descricao: string;
  ativa: boolean;
  clientes: number;
  valorSobGestao: number;
  taxaRecuperacao: number;
  tempoMedioPagamento: number | null; // dias, null se não houver títulos pagos
}

/** Efetividade por régua: clientes, valor sob gestão, taxa de recuperação e tempo médio até pagamento */
export function computeEfetividadePorRegua(titulos: TituloCarteira[], reguas: Regua[]): EfetividadeRegua[] {
  return reguas.map(r => {
    const doRegua = titulos.filter(t => t.regua === r.codigo);
    const abertos = doRegua.filter(t => t.status === 'Em aberto');
    const pagos = doRegua.filter(t => t.status === 'Pago');

    const valorAberto = abertos.reduce((s, t) => s + t.valor, 0);
    const valorPago = pagos.reduce((s, t) => s + (t.valorPago ?? t.valor), 0);
    const base = valorAberto + valorPago;

    const tempos = pagos
      .filter(t => t.dataPagamento)
      .map(t => diasEntre(parseData(t.dataPagamento as string), parseData(t.dataVencimento)));

    return {
      codigo: r.codigo,
      descricao: r.descricao,
      ativa: r.ativa,
      clientes: new Set(doRegua.map(t => t.cliente)).size,
      valorSobGestao: valorAberto,
      taxaRecuperacao: base ? Math.round((valorPago / base) * 1000) / 10 : 0,
      tempoMedioPagamento: tempos.length ? Math.round((tempos.reduce((s, d) => s + d, 0) / tempos.length) * 10) / 10 : null,
    };
  });
}

export interface ClienteResumo {
  cliente: string;
  tipo: 'PF' | 'PJ';
  qtdTitulos: number;
  qtdTitulosAberto: number;
  valorEmAberto: number;
  valorTotalPago: number;
  reguas: string[];
  qtdAcionamentos: number;
  ultimoAcionamento: string | null; // dataHora do acionamento mais recente
  temAtraso: boolean; // possui título em aberto vencido há mais de 30 dias
  filial: string;
  responsavel: string;
}

const SUFIXOS_PJ = ['ltda', 'me', 'sa', 's.a', 'eireli', 'epp'];

/** Heurística simples para inferir se o nome do cliente é pessoa jurídica (sem cadastro formal de tipo por cliente no mock) */
function inferTipoCliente(nome: string): 'PF' | 'PJ' {
  const lower = nome.toLowerCase().trim();
  return SUFIXOS_PJ.some(suf => lower.endsWith(' ' + suf) || lower.endsWith(' ' + suf + '.')) ? 'PJ' : 'PF';
}

/** Consolida a visão 360º de cada cliente a partir da carteira de títulos e do histórico de acionamentos */
export function computeClientesResumo(titulos: TituloCarteira[], execucoes: Execucao[]): ClienteResumo[] {
  const nomes = new Set<string>();
  titulos.forEach(t => nomes.add(t.cliente));
  execucoes.forEach(e => nomes.add(e.cliente));

  return Array.from(nomes).map(cliente => {
    const doCliente = titulos.filter(t => t.cliente === cliente);
    const abertos = doCliente.filter(t => t.status === 'Em aberto');
    const pagos = doCliente.filter(t => t.status === 'Pago');
    const execsCliente = execucoes.filter(e => e.cliente === cliente);

    let ultimoAcionamento: string | null = null;
    let ultimoTs = -Infinity;
    for (const e of execsCliente) {
      const ts = parseData(e.dataHora.split(' ')[0]).getTime();
      if (ts > ultimoTs) {
        ultimoTs = ts;
        ultimoAcionamento = e.dataHora;
      }
    }

    return {
      cliente,
      tipo: inferTipoCliente(cliente),
      qtdTitulos: doCliente.length,
      qtdTitulosAberto: abertos.length,
      valorEmAberto: abertos.reduce((s, t) => s + t.valor, 0),
      valorTotalPago: pagos.reduce((s, t) => s + (t.valorPago ?? t.valor), 0),
      reguas: Array.from(new Set(doCliente.map(t => t.regua))).sort(),
      qtdAcionamentos: execsCliente.length,
      ultimoAcionamento,
      temAtraso: abertos.some(t => {
        const b = agingBucketDe(t);
        return b === 'd31_60' || b === 'd61_90' || b === 'd90mais';
      }),
      filial: doCliente[0]?.filial ?? '—',
      responsavel: doCliente[0]?.responsavel ?? '—',
    };
  }).sort((a, b) => b.valorEmAberto - a.valorEmAberto);
}
