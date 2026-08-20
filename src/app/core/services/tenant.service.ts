import { APP_BASE_HREF } from '@angular/common';
import { Inject, Injectable, Optional } from '@angular/core';

/**
 * Unidade (tenant) atual — derivada do base href calculado em main.ts a partir do
 * primeiro segmento da URL (ex: /CF/dashboard -> "CF"). Fica fixa durante toda a vida
 * da aba/sessão; trocar de unidade exige um reload completo da página (o base href só
 * é calculado uma vez, no bootstrap) — ver TenantSelectComponent.
 */
@Injectable({ providedIn: 'root' })
export class TenantService {
  readonly code: string | null;

  constructor(@Optional() @Inject(APP_BASE_HREF) baseHref: string | null) {
    const seg = (baseHref ?? '/').split('/').filter(Boolean)[0];
    this.code = seg || null;
  }
}
