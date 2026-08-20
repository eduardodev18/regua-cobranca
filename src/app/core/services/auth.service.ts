import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, map, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, AuthUser, LoginData, LoginPayload, UserRole } from '../models/auth.model';
import { TenantService } from './tenant.service';

export type { UserRole, AuthUser };

/**
 * Autenticação real via API (POST {apiBase}/{tenant}/auth/login), seguindo o padrão
 * descrito em login-implementation.md (referência do portal-compras): sessão em
 * localStorage (token + expiresAt + dados do usuário), sem refresh token — expirou,
 * loga de novo. Portal é multi-tenant, então tudo é escopado pela unidade atual
 * (TenantService) para não vazar sessão entre unidades diferentes.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user = signal<AuthUser | null>(null);
  readonly user = this._user.asReadonly();

  readonly isLoggedIn = computed(() => this._user() !== null);
  readonly isAdmin = computed(() => this._user()?.role === 'admin');
  readonly isCliente = computed(() => this._user()?.role === 'cliente');

  constructor(private http: HttpClient, private tenant: TenantService) {
    // Feito no corpo do construtor (não como inicializador de campo) para garantir que
    // `this.tenant` já esteja atribuído quando lermos a sessão salva.
    this._user.set(this.readUserFromStorage());
  }

  login(payload: LoginPayload): Observable<LoginData> {
    const tenantCode = this.tenant.code;
    if (!tenantCode) {
      return throwError(() => new Error('Nenhuma unidade selecionada.'));
    }
    return this.http.post<ApiResponse<LoginData>>(`${environment.apiBase}/${tenantCode}/auth/login`, payload).pipe(
      map(response => {
        if (!response.success) throw new Error(response.message || 'Erro ao efetuar login.');
        return response.data;
      }),
      tap(data => this.setSession(data))
    );
  }

  /** Limpa apenas as chaves de sessão da unidade atual (não faz localStorage.clear()
   *  completo — ver "gaps conhecidos" no documento de referência). */
  logout(): void {
    localStorage.removeItem(this.key('access_token'));
    localStorage.removeItem(this.key('expires_at'));
    localStorage.removeItem(this.key('user_info'));
    this._user.set(null);
  }

  get token(): string | null {
    return localStorage.getItem(this.key('access_token'));
  }

  isTokenExpired(): boolean {
    const expiresAt = localStorage.getItem(this.key('expires_at'));
    if (!expiresAt) return true;
    return new Date(expiresAt) <= new Date();
  }

  /** Expiração client-side é inferida comparando expiresAt local; 401 vindo do backend
   *  (sessão revogada do lado do servidor) é tratado à parte, no authInterceptor. */
  isAuthenticated(): boolean {
    return !!this.token && !this.isTokenExpired();
  }

  private setSession(data: LoginData): void {
    localStorage.setItem(this.key('access_token'), data.accessToken);
    localStorage.setItem(this.key('expires_at'), data.expiresAt);
    const user: AuthUser = {
      // TODO: a API de login não retorna role — não há hoje um critério pra distinguir
      // admin de cliente nessa resposta. Por decisão explícita, todo login autenticado
      // por aqui é tratado como admin. Revisar quando houver login de cliente definido.
      role: 'admin',
      nomeExibicao: data.nome,
      cnpj: data.cnpj,
      codFornecedor: data.codFornecedor
    };
    localStorage.setItem(this.key('user_info'), JSON.stringify(user));
    this._user.set(user);
  }

  private readUserFromStorage(): AuthUser | null {
    const raw = localStorage.getItem(this.key('user_info'));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  /** Prefixa a chave de storage com o código da unidade, pra sessões de tenants
   *  diferentes não se sobreporem no mesmo navegador. */
  private key(name: string): string {
    return this.tenant.code ? `${this.tenant.code}:${name}` : name;
  }
}
