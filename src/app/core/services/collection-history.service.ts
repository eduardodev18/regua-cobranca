import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.model';
import { ApiHistoryPage, ApiRegisterResultPayload } from '../models/api-history.model';
import { TenantService } from './tenant.service';

/**
 * Histórico — /api/{tenant}/collection-history (ver seção 5 do API_REGUA_COBRANCA.md).
 *
 * IMPORTANTE: a consulta é sempre por cliente (`clientCode`) — não existe endpoint pra
 * listar o histórico de todos os clientes de uma vez. `clientCode` é o código Protheus
 * do cliente (ex: "150807" no exemplo do doc), não o nome nem o CNPJ — ainda não temos
 * de onde tirar esse código no front (não há endpoint de clientes/fornecedores neste
 * documento), então quem chamar este serviço precisa ter esse código de outra fonte.
 */
@Injectable({ providedIn: 'root' })
export class CollectionHistoryService {
  private http = inject(HttpClient);
  private tenant = inject(TenantService);

  private get base(): string {
    return `${environment.apiBase}/${this.tenant.code}/collection-history`;
  }

  getByClient(
    clientCode: string,
    opts: { page?: number; pageSize?: number; codRegua?: string; status?: string } = {}
  ): Observable<ApiHistoryPage> {
    let params = new HttpParams();
    if (opts.page) params = params.set('page', opts.page);
    if (opts.pageSize) params = params.set('pageSize', opts.pageSize);
    if (opts.codRegua) params = params.set('codRegua', opts.codRegua);
    if (opts.status) params = params.set('status', opts.status);

    return this.http
      .get<ApiResponse<ApiHistoryPage>>(`${this.base}/${clientCode}`, { params })
      .pipe(map(r => r.data));
  }

  /** Fluxo "operador ligou pro cliente" — tabulação de contato manual. */
  registerResult(payload: ApiRegisterResultPayload): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.base}/register-result`, payload)
      .pipe(map(() => undefined));
  }
}
