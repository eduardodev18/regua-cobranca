// Modelos que espelham o schema real da API para Réguas de Cobrança (collection-rules),
// suas Etapas (steps) e Ações extras (steps/{seq}/actions) — ver seção 4 e 4.1 do
// API_REGUA_COBRANCA.md. Campos codificados: '1' = Sim, '2' = Não.

export interface ApiRuleStep {
  sequencia: string;
  diaRelativo: number;
  canal: string;
  codAcao: string;
  codTemplate: string;
  horaInicio: string | null;
  horaFim: string | null;
  ativo: '1' | '2';
}

/** Body de step em POST/PUT — sem "sequencia" (vem da rota no PUT, é automática no POST). */
export interface ApiRuleStepPayload {
  diaRelativo: number;
  canal: string;
  codAcao: string;
  codTemplate: string;
  horaInicio: string | null;
  horaFim: string | null;
  ativo: '1' | '2';
}

export interface ApiRule {
  codigo: string;
  descricao: string;
  ativo: '1' | '2';
  prioridade: number;
  dataInicio: string;
  dataFim: string;
  filtro: string | null;
  tipoCliente: string; // 'F' | 'P' | 'T'
  valorMinimo: number;
  valorMaximo: number;
  permiteJuridico: '1' | '2';
  permiteBloqueio: '1' | '2';
  observacao: string | null;
  steps: ApiRuleStep[];
}

/** Body do cabeçalho — usado tanto no PUT (sozinho) quanto embutido no POST (com steps). */
export interface ApiRuleHeaderPayload {
  descricao: string;
  ativo: '1' | '2';
  prioridade: number;
  dataInicio: string; // yyyy-MM-dd
  dataFim: string;
  filtro: string | null;
  tipoCliente: string;
  valorMinimo: number;
  valorMaximo: number;
  permiteJuridico: '1' | '2';
  permiteBloqueio: '1' | '2';
  observacao: string | null;
}

/** Body do POST de criação — cabeçalho + pelo menos 1 step (transação única). */
export interface ApiRuleCreatePayload extends ApiRuleHeaderPayload {
  steps: ApiRuleStepPayload[];
}

/** Ação extra de uma etapa (opcional — além da já configurada em canal/codAcao/codTemplate do step). */
export interface ApiRuleAction {
  sequencia: string;
  tipoAcao: string;
  codTemplate: string;
  prazo: number; // dias de espera até a próxima etapa poder ser avaliada (0 = sem prazo extra)
  ativo: '1' | '2';
}

export interface ApiRuleActionPayload {
  tipoAcao: string;
  codTemplate: string;
  prazo: number;
  ativo: '1' | '2';
}
