/** Formata um CNPJ (completo ou parcial, conforme o usuário digita) como 00.000.000/0000-00. */
export function formatCnpj(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '').slice(0, 14);
  if (digits.length > 12) return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5');
  if (digits.length > 8) return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
  if (digits.length > 5) return digits.replace(/^(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
  if (digits.length > 2) return digits.replace(/^(\d{2})(\d{0,3})/, '$1.$2');
  return digits;
}
