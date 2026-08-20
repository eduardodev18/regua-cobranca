/** Formata um número como moeda brasileira, ex: 1234.5 -> "R$ 1.234,50". */
export function formatMoneyBRL(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Extrai o valor numérico (em reais) a partir do texto digitado num campo com máscara
 * monetária. Trata os dígitos digitados como centavos — ex: digitar "12345" vira R$ 123,45,
 * digitar mais um "6" vira R$ 1.234,56 — que é o padrão mais prático de máscara monetária
 * em campo de texto (o cursor sempre avança pro fim, sem precisar controlar posição).
 */
export function parseMoneyInput(raw: string): number {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return 0;
  return Number(digits) / 100;
}
