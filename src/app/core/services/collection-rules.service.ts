import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.model';
import {
  ApiRule, ApiRuleAction, ApiRuleActionPayload, ApiRuleCreatePayload, ApiRuleHeaderPayload,
  ApiRuleStep, ApiRuleStepPayload
} from '../models/api-rules.model';
import { TenantService } from './tenant.service';

/**
 * Réguas de Cobrança + Etapas + Ações extras — /api/{tenant}/collection-rules
 * (ver seção 4 e 4.1 do API_REGUA_COBRANCA.md).
 *
 * Respostas de mutação (POST/PUT/DELETE) de steps/actions não têm formato documentado
 * com certeza — por segurança, os métodos daqui não dependem do corpo retornado (exceto
 * a criação da régua, cujo "data" = código gerado, isso está documentado). O padrão é:
 * o componente chamador recarrega a régua/lista depois da mutação.
 */
@Injectable({ providedIn: 'root' })
export class CollectionRulesService {
  private http = inject(HttpClient);
  private tenant = inject(TenantService);

  private get base(): string {
    return `${environment.apiBase}/${this.tenant.code}/collection-rules`;
  }

  // ---------- Régua (cabeçalho) ----------
  list(): Observable<ApiRule[]> {
    return this.http.get<ApiResponse<ApiRule[]>>(this.base).pipe(map(r => r.data));
  }

  get(ruleCode: string): Observable<ApiRule> {
    return this.http.get<ApiResponse<ApiRule>>(`${this.base}/${ruleCode}`).pipe(map(r => r.data));
  }

  /** Cria a régua e suas etapas numa transação única. Retorna o código gerado. */
  create(payload: ApiRuleCreatePayload): Observable<string> {
    return this.http.post<ApiResponse<string>>(this.base, payload).pipe(map(r => r.data));
  }

  /** Atualiza só o cabeçalho (sem steps). */
  updateHeader(ruleCode: string, payload: ApiRuleHeaderPayload): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.base}/${ruleCode}`, payload).pipe(map(() => undefined));
  }

  /** Remove a régua e todas as suas etapas. */
  remove(ruleCode: string): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.base}/${ruleCode}`).pipe(map(() => undefined));
  }

  // ---------- Etapas ----------
  getSteps(ruleCode: string): Observable<ApiRuleStep[]> {
    return this.http.get<ApiResponse<ApiRuleStep[]>>(`${this.base}/${ruleCode}/steps`).pipe(map(r => r.data));
  }

  addStep(ruleCode: string, payload: ApiRuleStepPayload): Observable<void> {
    return this.http.post<ApiResponse<unknown>>(`${this.base}/${ruleCode}/steps`, payload).pipe(map(() => undefined));
  }

  updateStep(ruleCode: string, stepSequence: string, payload: ApiRuleStepPayload): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.base}/${ruleCode}/steps/${stepSequence}`, payload).pipe(map(() => undefined));
  }

  removeStep(ruleCode: string, stepSequence: string): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.base}/${ruleCode}/steps/${stepSequence}`).pipe(map(() => undefined));
  }

  // ---------- Ações extras da etapa ----------
  listActions(ruleCode: string, stepSequence: string): Observable<ApiRuleAction[]> {
    return this.http.get<ApiResponse<ApiRuleAction[]>>(`${this.base}/${ruleCode}/steps/${stepSequence}/actions`).pipe(map(r => r.data));
  }

  addAction(ruleCode: string, stepSequence: string, payload: ApiRuleActionPayload): Observable<void> {
    return this.http.post<ApiResponse<unknown>>(`${this.base}/${ruleCode}/steps/${stepSequence}/actions`, payload).pipe(map(() => undefined));
  }

  updateAction(ruleCode: string, stepSequence: string, actionSequence: string, payload: ApiRuleActionPayload): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.base}/${ruleCode}/steps/${stepSequence}/actions/${actionSequence}`, payload).pipe(map(() => undefined));
  }

  removeAction(ruleCode: string, stepSequence: string, actionSequence: string): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.base}/${ruleCode}/steps/${stepSequence}/actions/${actionSequence}`).pipe(map(() => undefined));
  }
}
