import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.model';
import { ApiActionType } from '../models/api-catalog.model';
import { TenantService } from './tenant.service';

/** Catálogo de Tipos de Ação — GET /api/{tenant}/collection-action-types (somente leitura). */
@Injectable({ providedIn: 'root' })
export class CollectionActionTypesService {
  private http = inject(HttpClient);
  private tenant = inject(TenantService);

  private get base(): string {
    return `${environment.apiBase}/${this.tenant.code}/collection-action-types`;
  }

  list(): Observable<ApiActionType[]> {
    return this.http.get<ApiResponse<ApiActionType[]>>(this.base).pipe(map(r => r.data));
  }
}
