// Conversão entre o modelo de exibição `Regua` (core/models/index.ts, usado pelas telas)
// e o shape real da API (`ApiRule`, core/models/api-rules.model.ts).

import { Regua } from '../models';
import { ApiRule, ApiRuleHeaderPayload } from '../models/api-rules.model';
import {
  boolToFlag, brDateToIso, fixInterleavedSpacing, flagToBool, isoDateToBr, tipoClienteFromApi, tipoClienteToApi
} from './protheus-mappers';

export function mapApiRuleToRegua(r: ApiRule): Regua {
  return {
    codigo: r.codigo,
    descricao: r.descricao,
    ativa: flagToBool(r.ativo),
    prioridade: r.prioridade,
    dtInicio: isoDateToBr(r.dataInicio),
    dtFim: isoDateToBr(r.dataFim),
    tipoCliente: tipoClienteFromApi(r.tipoCliente),
    valorMin: r.valorMinimo,
    valorMax: r.valorMaximo,
    permiteJuridico: flagToBool(r.permiteJuridico),
    permiteBloqueio: flagToBool(r.permiteBloqueio),
    // `fixInterleavedSpacing`: alguns registros voltam com esse campo corrompido pela API
    // (uma letra "T e s t e" em vez de "Teste") — ver protheus-mappers.ts.
    observacoes: fixInterleavedSpacing(r.observacao) ?? ''
  };
}

export function mapReguaToHeaderPayload(r: Regua): ApiRuleHeaderPayload {
  return {
    descricao: r.descricao.trim(),
    ativo: boolToFlag(r.ativa),
    prioridade: r.prioridade,
    dataInicio: brDateToIso(r.dtInicio),
    dataFim: brDateToIso(r.dtFim),
    filtro: null,
    tipoCliente: tipoClienteToApi(r.tipoCliente),
    valorMinimo: r.valorMin,
    valorMaximo: r.valorMax,
    permiteJuridico: boolToFlag(r.permiteJuridico),
    permiteBloqueio: boolToFlag(r.permiteBloqueio),
    observacao: r.observacoes?.trim() || null
  };
}
