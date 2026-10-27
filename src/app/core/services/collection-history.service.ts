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
 * `clientCode` agora é opcional: informado, consulta só aquele cliente
 * (GET .../collection-history/{clientCode}); omitido, o backend lista de todos os
 * clientes (GET .../collection-history), sempre paginado e filtrável por régua/status.
 * `clientCode`, quando usado, é o código Protheus do cliente (ex: "150807" no exemplo do
 * doc), não o nome nem o CNPJ.
 */
@Injectable({ providedIn: 'root' })
export class CollectionHistoryService {
  private http = inject(HttpClient);
  private tenant = inject(TenantService);

  private get base(): string {
    return `${environment.apiBase}/${this.tenant.code}/collection-history`;
  }

  getByClient(
    clientCode: string | null | undefined,
    opts: { page?: number; pageSize?: number; codRegua?: string; status?: string } = {}
  ): Observable<ApiHistoryPage> {
    let params = new HttpParams();
    if (opts.page) params = params.set('page', opts.page);
    if (opts.pageSize) params = params.set('pageSize', opts.pageSize);
    if (opts.codRegua) params = params.set('codRegua', opts.codRegua);
    if (opts.status) params = params.set('status', opts.status);

    const code = clientCode?.trim();
    const url = code ? `${this.base}/${code}` : this.base;

    return this.http
      .get<ApiResponse<ApiHistoryPage>>(url, { params })
      .pipe(map(r => r.data));
  }

  /** Fluxo "operador ligou pro cliente" — tabulação de contato manual. */
  registerResult(payload: ApiRegisterResultPayload): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.base}/register-result`, payload)
      .pipe(map(() => undefined));
  }
}
