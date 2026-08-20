import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, UserRole } from '../services/auth.service';
import { TenantService } from '../services/tenant.service';

/** Exige sessão válida para acessar a área interna (shell).
 *  Sem unidade (tenant) na URL -> manda escolher em /selecionar-unidade.
 *  Token expirado -> logout + volta pro /login com aviso de sessão expirada.
 *  Sem sessão -> volta pro /login guardando a rota original em ?redirect=. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const tenant = inject(TenantService);
  const router = inject(Router);

  if (!tenant.code) return router.parseUrl('/selecionar-unidade');

  const token = auth.token;

  if (token && auth.isTokenExpired()) {
    auth.logout();
    return router.createUrlTree(['/login'], { queryParams: { session: 'expired', redirect: state.url } });
  }

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
  }

  return true;
};

/** Impede usuário já logado de ver a tela de login, e manda escolher unidade
 *  se a URL não tiver um tenant identificável. */
export const publicGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const tenant = inject(TenantService);
  const router = inject(Router);

  if (!tenant.code) return router.parseUrl('/selecionar-unidade');
  if (auth.isAuthenticated()) return router.parseUrl('/');
  return true;
};

/** Restringe uma rota a determinados perfis. Cliente tentando acessar área de administrador
 *  é redirecionado para a própria área dele em vez de ver um erro.
 *  Nota: hoje todo login autenticado é tratado como 'admin' (ver AuthService.setSession),
 *  então o ramo 'cliente' abaixo fica sem uso até existir um critério real de perfil —
 *  mantido pronto pra quando isso for definido. */
export function roleGuard(roles: UserRole[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isAuthenticated()) return router.parseUrl('/login');
    const user = auth.user();
    if (!user) return router.parseUrl('/login');
    if (roles.includes(user.role)) return true;
    if (user.role === 'cliente' && user.clienteNome) {
      return router.parseUrl('/clientes/' + encodeURIComponent(user.clienteNome));
    }
    return router.parseUrl('/reguas');
  };
}

/** Regra específica da tela de detalhe do cliente: admin vê qualquer cliente,
 *  cliente logado só pode ver a própria página. */
export const clienteDetalheGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.parseUrl('/login');
  const user = auth.user();
  if (!user) return router.parseUrl('/login');
  if (user.role === 'admin') return true;
  const nome = route.paramMap.get('nome');
  if (user.role === 'cliente' && nome === user.clienteNome) return true;
  return router.parseUrl('/clientes/' + encodeURIComponent(user.clienteNome ?? ''));
};
