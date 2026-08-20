import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Anexa `Authorization: Bearer <token>` em toda requisição HTTP.
 * Segue o padrão do autenticacao-implementacao.md (adaptado pra login clássico, sem OIDC):
 * 1. Sem token -> deixa passar sem header.
 * 2. Token expirado (client-side, comparando expiresAt) -> logout, redireciona pro /login,
 *    deixa a requisição seguir sem header.
 * 3. Token válido -> injeta o header.
 * 4. Backend responde 401 (sessão inválida/revogada do lado do servidor, não pega no check
 *    de expiração acima) -> logout automático + redireciona pro /login. É o item que o MD de
 *    referência descreve (`RequestInterceptor` do projeto original) e que ainda não existia
 *    aqui — via `catchError`, porque um 401 do HttpClient vem pelo canal de erro, não pelo
 *    `tap` de sucesso como no exemplo original.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.token;

  if (!token) return next(req);

  if (authService.isTokenExpired()) {
    authService.logout();
    router.navigate(['/login'], { queryParams: { session: 'expired' } });
    return next(req);
  }

  const authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  return next(authReq).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && authService.isAuthenticated()) {
        authService.logout();
        router.navigate(['/login'], { queryParams: { session: 'expired' } });
      }
      return throwError(() => err);
    })
  );
};
