// Modelos que espelham exatamente o schema real da API (ver API_REGUA_COBRANCA.md),
// diferente dos modelos "de exibição" em core/models/index.ts (usados pelo mock).
// Campos codificados (Protheus): '1' = Sim, '2' = Não.

/** Tipos de Ação — catálogo fixo, somente leitura (GET /collection-action-types).
 *  Cadastro é feito só pelo time de Protheus (ADVPL), não existe POST/PUT/DELETE. */
export interface ApiActionType {
  codigo: string;
  descricao: string;
  funcao: string; // função ADVPL executada pelo motor (ex: U_ZCRSENDEMAIL)
  tipo: string; // ex: "COMUN" — sem documentação adicional do significado
  canal: string; // ex: EMAIL, WPP, SMS — mesmo código usado em templates/etapas
}

/** Templates de mensagem (collection-templates). */
export interface ApiTemplate {
  codigo: string;
  descricao: string;
  canal: string; // EMAIL | WPP | SMS
  assunto: string | null;
  corpo: string;
  ativo: '1' | '2';
}

/** Body de criação/atualização de template — sem "codigo" (gerado pelo backend no POST). */
export interface ApiTemplatePayload {
  descricao: string;
  canal: string;
  assunto: string | null;
  corpo: string;
  ativo: '1' | '2';
}
