import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.model';
import { ApiTemplate, ApiTemplatePayload } from '../models/api-catalog.model';
import { TenantService } from './tenant.service';

/** CRUD real de templates — /api/{tenant}/collection-templates. */
@Injectable({ providedIn: 'root' })
export class CollectionTemplatesService {
  private http = inject(HttpClient);
  private tenant = inject(TenantService);

  private get base(): string {
    return `${environment.apiBase}/${this.tenant.code}/collection-templates`;
  }

  list(): Observable<ApiTemplate[]> {
    return this.http.get<ApiResponse<ApiTemplate[]>>(this.base).pipe(map(r => r.data));
  }

  get(codigo: string): Observable<ApiTemplate> {
    return this.http.get<ApiResponse<ApiTemplate>>(`${this.base}/${codigo}`).pipe(map(r => r.data));
  }

  /** Retorna o código gerado pelo backend. */
  create(payload: ApiTemplatePayload): Observable<string> {
    return this.http.post<ApiResponse<string>>(this.base, payload).pipe(map(r => r.data));
  }

  update(codigo: string, payload: ApiTemplatePayload): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.base}/${codigo}`, payload).pipe(map(() => undefined));
  }

  remove(codigo: string): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.base}/${codigo}`).pipe(map(() => undefined));
  }
}
