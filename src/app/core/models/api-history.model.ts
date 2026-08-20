// Modelos que espelham o schema real da API para Histórico (collection-history) —
// ver seção 5 do API_REGUA_COBRANCA.md.

export type ApiHistoryStatus = 'PENDENTE' | 'EXECUTADO' | 'ERRO' | 'IGNORADO';

/** Status aceitos por POST /collection-history/register-result. */
export type ApiRegisterResultStatus = 'PROMESSA' | '2VIA' | 'CONTEST' | 'SEM_CONT' | 'TEL_INV' | 'OUTROS';

export interface ApiHistoryItem {
  prefixo: string | null;
  numTitulo: string | null;
  parcela: string | null;
  tipoTitulo: string | null;
  codCliente: string;
  loja: string | null;
  codRegua: string;
  sequencia: string | null;
  canal: string;
  status: string;
  hora: string;
  usuario: string | null;
  dataPromessa: string | null;
  retorno: string | null;
  observacao: string | null;
  destino: string | null;
  seqEtapa: string;
  seqAcao: string;
  tipoAcao: string;
  dataExecucao: string;
}

export interface ApiHistoryPage {
  items: ApiHistoryItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/** Body de POST register-result. "usuario" nunca é enviado — o backend preenche a
 *  partir do claim do JWT do usuário logado. */
export interface ApiRegisterResultPayload {
  prefixo?: string | null;
  numTitulo?: string | null;
  parcela?: string | null;
  tipoTitulo?: string | null;
  codCliente: string;
  loja?: string | null;
  codRegua: string;
  seqEtapa: string;
  seqAcao: string;
  status: ApiRegisterResultStatus;
  /** Obrigatória quando status === 'PROMESSA'. */
  dataPromessa?: string | null;
  observacao?: string | null;
  destino?: string | null;
}
