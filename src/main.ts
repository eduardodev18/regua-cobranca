import { bootstrapApplication } from '@angular/platform-browser';
import { APP_BASE_HREF } from '@angular/common';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

/**
 * Portal multi-tenant (unidades OAB: CF, DF, AM...): o primeiro segmento da URL
 * identifica a unidade, ex: https://host/CF/dashboard.
 *
 * Detectamos isso aqui, ANTES do bootstrap, e usamos como base href do app. Assim
 * TODAS as rotas em app.routes.ts continuam declaradas sem prefixo (login, dashboard,
 * reguas...) e o Router/Location do Angular cuidam de ler e escrever o prefixo de
 * tenant na barra de endereço automaticamente — nenhum routerLink/guard precisa saber
 * disso. Quem precisa do código da unidade (AuthService, chamadas HTTP) usa o
 * TenantService, que lê esse mesmo base href.
 *
 * IMPORTANTE: manter esta lista em sincronia com os paths de topo/filhos declarados em
 * app.routes.ts. Um path aqui listado é tratado como rota da aplicação (sem tenant);
 * qualquer outro primeiro segmento é tratado como código de unidade.
 */
const KNOWN_APP_ROUTES = new Set([
  'login', 'selecionar-unidade', 'dashboard', 'reguas', 'templates', 'tipos-acao',
  'historico', 'titulos', 'clientes', 'relatorios', 'configuracoes'
]);

function detectBaseHref(): string {
  const seg = window.location.pathname.split('/').filter(Boolean)[0];
  if (!seg || KNOWN_APP_ROUTES.has(seg)) return '/';
  return `/${seg}/`;
}

bootstrapApplication(AppComponent, {
  providers: [
    ...(appConfig.providers ?? []),
    { provide: APP_BASE_HREF, useValue: detectBaseHref() }
  ]
}).catch((err) => console.error(err));
