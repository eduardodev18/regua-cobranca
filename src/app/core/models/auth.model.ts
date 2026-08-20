// Modelos de autenticação — login real via API (POST {apiBase}/{tenant}/auth/login).
// Baseado na referência do portal-compras (login-implementation.md).

export type UserRole = 'admin' | 'cliente';

export interface LoginPayload {
  username: string; // CNPJ do usuário, sem máscara
  password: string;
}

/** Payload real de data — a API não retorna role (todo login autenticado por aqui é
 *  tratado como admin por ora; ver AuthService.setSession). */
export interface LoginData {
  accessToken: string;
  expiresAt: string; // ISO date string
  nome: string; // nome de exibição do usuário/fornecedor
  cnpj: string;
  codFornecedor: string;
}

/** Envelope padrão da API. */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

/** Sessão do usuário mantida em memória (signal) e espelhada em localStorage. */
export interface AuthUser {
  role: UserRole;
  nomeExibicao: string;
  cnpj: string;
  codFornecedor: string;
  /** Presente apenas quando role === 'cliente' — chave usada para filtrar Carteira/Histórico
   *  (equivalente ao nome do cliente em MockDataService). Sem critério de API ainda para
   *  popular isso — ver TODO em AuthService.setSession. */
  clienteNome?: string;
}
