import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';
import { authGuard, clienteDetalheGuard, publicGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'selecionar-unidade',
    loadComponent: () => import('./features/tenant-select/tenant-select.component').then(m => m.TenantSelectComponent),
    title: 'Selecionar Unidade | NEXA Régua de Cobrança'
  },
  {
    path: 'login',
    canActivate: [publicGuard],
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
    title: 'Entrar | NEXA Régua de Cobrança'
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'reguas' },

      {
        path: 'dashboard',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
        title: 'Dashboard | NEXA Régua de Cobrança'
      },

      // ---- Réal — integrado à API (collection-rules) ----
      {
        path: 'reguas',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () => import('./features/reguas/regua-list/regua-list.component').then(m => m.ReguaListComponent),
        title: 'Cadastro de Réguas | NEXA Régua de Cobrança'
      },
      {
        path: 'reguas/:codigo/etapas',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () => import('./features/etapas/etapa-list/etapa-list.component').then(m => m.EtapaListComponent),
        title: 'Etapas da Régua | NEXA Régua de Cobrança'
      },
      {
        path: 'reguas/:codigo/etapas/:seq/acoes',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () => import('./features/acoes/acao-list/acao-list.component').then(m => m.AcaoListComponent),
        title: 'Ações da Etapa | NEXA Régua de Cobrança'
      },
      {
        path: 'templates',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () => import('./features/templates/template-list/template-list.component').then(m => m.TemplateListComponent),
        title: 'Templates | NEXA Régua de Cobrança'
      },
      {
        path: 'tipos-acao',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () => import('./features/tipos-acao/tipo-acao-list/tipo-acao-list.component').then(m => m.TipoAcaoListComponent),
        title: 'Tipos de Ação | NEXA Régua de Cobrança'
      },

      // ---- Real — integrado à API (collection-history) ----
      {
        path: 'historico',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () => import('./features/historico/historico-list.component').then(m => m.HistoricoListComponent),
        title: 'Histórico / Execuções | NEXA Régua de Cobrança'
      },

      {
        path: 'titulos',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () => import('./features/titulos/titulos-list/titulos-list.component').then(m => m.TitulosListComponent),
        title: 'Carteira de Títulos | NEXA Régua de Cobrança'
      },
      {
        path: 'clientes',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () => import('./features/clientes/cliente-list/cliente-list.component').then(m => m.ClienteListComponent),
        title: 'Visão do Cliente | NEXA Régua de Cobrança'
      },
      {
        path: 'clientes/:nome',
        canActivate: [clienteDetalheGuard],
        loadComponent: () => import('./features/clientes/cliente-detalhe/cliente-detalhe.component').then(m => m.ClienteDetalheComponent),
        title: 'Visão do Cliente | NEXA Régua de Cobrança'
      },
      {
        path: 'relatorios',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () => import('./features/relatorios/relatorios.component').then(m => m.RelatoriosComponent),
        title: 'Relatórios | NEXA Régua de Cobrança'
      },
      {
        path: 'configuracoes',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () => import('./features/configuracoes/configuracoes.component').then(m => m.ConfiguracoesComponent),
        title: 'Configurações | NEXA Régua de Cobrança'
      },
    ]
  },
  { path: '**', redirectTo: 'reguas' }
];
