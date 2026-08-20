// Ambiente de desenvolvimento / homologação.
// Portal multi-tenant: apiBase NÃO inclui a unidade — o código do tenant (CF, DF...) é
// resolvido em runtime pelo TenantService e concatenado pelo AuthService
// ({apiBase}/{tenant}/auth/login).
export const environment = {
  production: false,
  apiBase: 'https://portaldecompras-hom.oab.org.br/api'
};
