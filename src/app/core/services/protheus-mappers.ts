// Conversões entre o formato de exibição usado pelas telas (herdado do protótipo mock) e
// os campos codificados que a API real espera/retorna (ver "Campos codificados (Protheus)"
// no API_REGUA_COBRANCA.md).

import { TipoCliente } from '../models';

/** '1' = Sim, '2' = Não */
export function flagToBool(v: string | null | undefined): boolean {
  return v === '1';
}

export function boolToFlag(v: boolean): '1' | '2' {
  return v ? '1' : '2';
}

/** tipoCliente: API usa 'F' (Física) / 'P' (Jurídica) / 'T' (Todos) — tela usa PF/PJ/Todos. */
export function tipoClienteFromApi(v: string): TipoCliente {
  return v === 'F' ? 'PF' : v === 'P' ? 'PJ' : 'Todos';
}

export function tipoClienteToApi(v: TipoCliente): 'F' | 'P' | 'T' {
  return v === 'PF' ? 'F' : v === 'PJ' ? 'P' : 'T';
}

/** dd/mm/aaaa -> yyyy-MM-dd (formato aceito no body da API). Retorna string vazia se inválido. */
export function brDateToIso(v: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((v || '').trim());
  if (!m) return '';
  const [, d, mo, y] = m;
  return `${y}-${mo}-${d}`;
}

/** yyyy-MM-dd ou yyyy-MM-ddTHH:mm:ss (o que a API retorna) -> dd/mm/aaaa, pra exibição/edição. */
export function isoDateToBr(v: string | null | undefined): string {
  if (!v) return '';
  const datePart = v.split('T')[0];
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!m) return v;
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
}

/**
 * Corrige um bug de encoding confirmado em alguns campos de texto livre vindos da API (ex:
 * campo "observacao" de regua) — a string chega com um caractere nulo (U+0000) depois de
 * CADA caractere, ex: "Teste" virando "T" + nulo + "e" + nulo + "s" + nulo + ... É a
 * assinatura clássica de um texto originalmente em UTF-16LE (2 bytes por caractere: o byte
 * do caractere seguido de 0x00, pra texto latino) lido em algum ponto como se fosse texto de
 * 1 byte por caractere — provavelmente do lado de quem gravou aquele registro no Protheus.
 *
 * Detecta isso checando se, indo de 2 em 2 caracteres, o segundo de cada par é o nulo (em
 * quase 100% dos pares) — bem mais preciso que tentar adivinhar por posição par/ímpar de
 * espaço, porque o próprio texto original pode ter espaços entre palavras (o que atrapalha
 * uma heurística baseada só em espaço). Textos sem nenhum caractere nulo saem inalterados.
 */
export function fixInterleavedSpacing(v: string | null | undefined): string {
  if (!v) return v ?? '';

  const NUL = String.fromCharCode(0);
  if (v.indexOf(NUL) === -1) return v;

  const chars = Array.from(v);
  if (chars.length < 4) return v;

  let matches = 0;
  let total = 0;
  for (let i = 0; i < chars.length; i += 2) {
    total++;
    if (chars[i + 1] === NUL) matches++;
  }
  if (total === 0 || matches / total < 0.9) return v;

  return chars.filter(c => c !== NUL).join('');
}
