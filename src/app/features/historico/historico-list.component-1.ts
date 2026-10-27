import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ModalComponent } from '../../shared/modal/modal.component';
import { CollectionHistoryService } from '../../core/services/collection-history.service';
import { CollectionRulesService } from '../../core/services/collection-rules.service';
import { ApiHistoryItem, ApiHistoryStatus, ApiRegisterResultStatus } from '../../core/models/api-history.model';
import { ApiRule } from '../../core/models/api-rules.model';

const STATUS_LABEL: Record<ApiHistoryStatus, string> = {
  PENDENTE: 'Pendente',
  EXECUTADO: 'Executado',
  ERRO: 'Erro',
  IGNORADO: 'Ignorado'
};

const STATUS_BADGE: Record<ApiHistoryStatus, string> = {
  PENDENTE: 'badge-amber',
  EXECUTADO: 'badge-green',
  ERRO: 'badge-red',
  IGNORADO: 'badge-gray'
};

const REGISTER_STATUS_OPTIONS: { value: ApiRegisterResultStatus; label: string }[] = [
  { value: 'PROMESSA', label: 'Promessa de Pagamento' },
  { value: '2VIA', label: 'Solicitou 2ª Via' },
  { value: 'CONTEST', label: 'Contestação' },
  { value: 'SEM_CONT', label: 'Sem Contato' },
  { value: 'TEL_INV', label: 'Telefone Inválido' },
  { value: 'OUTROS', label: 'Outros' }
];

interface RegistroForm {
  codCliente: string;
  loja: string;
  codRegua: string;
  seqEtapa: string;
  seqAcao: string;
  status: ApiRegisterResultStatus;
  dataPromessa: string;
  observacao: string;
  destino: string;
  prefixo: string;
  numTitulo: string;
  parcela: string;
  tipoTitulo: string;
}

/**
 * Histórico (collection-history) — ver seção 5 do API_REGUA_COBRANCA.md.
 *
 * A API só permite consulta paginada POR CLIENTE (GET .../collection-history/{clientCode})
 * e registro de contato manual (POST .../collection-history/register-result) — não existe
 * endpoint que liste histórico de todos os clientes de uma vez. Por isso esta tela funciona
 * como uma "consulta": o operador informa o código do cliente (Protheus) e, opcionalmente,
 * filtra por régua/status. Ainda não há um domínio de Clientes/Fornecedores no front pra
 * buscar esse código por nome — por ora é digitado manualmente (ver PENDENCIAS_BACKEND.md).
 */
@Component({
  selector: 'app-historico-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ModalComponent],
  templateUrl: './historico-list.component.html',
  styleUrl: './historico-list.component.css'
})
export class HistoricoListComponent implements OnInit {
  private historyService = inject(CollectionHistoryService);
  private rulesService = inject(CollectionRulesService);

  reguas = signal<ApiRule[]>([]);
  statusOptions: ApiHistoryStatus[] = ['PENDENTE', 'EXECUTADO', 'ERRO', 'IGNORADO'];
  registerStatusOptions = REGISTER_STATUS_OPTIONS;

  codCliente = signal('');
  reguaFiltro = signal('todas');
  statusFiltro = signal<'todos' | ApiHistoryStatus>('todos');

  page = signal(1);
  pageSize = 10;
  totalItems = signal(0);
  totalPages = signal(1);

  items = signal<ApiHistoryItem[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  searched = signal(false);

  detalhe = signal<ApiHistoryItem | null>(null);

  showRegistro = signal(false);
  registroForm: RegistroForm = this.blankRegistroForm();
  registering = signal(false);
  /** Mensagens de erro pra exibir no banner do modal — tanto validação local quanto as
   *  que a API devolve (ver `parseValidationErrors`). */
  registerErrors = signal<string[]>([]);
  /** Erros de validação da API associados a um campo específico (chave = nome do campo em
   *  `RegistroForm`), pra destacar o input com borda vermelha — ver `[class.invalid]` no html. */
  registerFieldErrors = signal<Record<string, string>>({});

  constructor(route: ActivatedRoute) {
    const q = route.snapshot.queryParamMap;
    if (q.get('codCliente')) this.codCliente.set(q.get('codCliente')!);
  }

  ngOnInit(): void {
    this.rulesService.list().subscribe({ next: (data) => this.reguas.set(data) });
    if (this.codCliente().trim()) this.buscar();
  }

  buscar(): void {
    const cliente = this.codCliente().trim();
    if (!cliente) {
      this.error.set('Informe o código do cliente para consultar o histórico.');
      return;
    }
    this.page.set(1);
    this.carregarPagina();
  }

  private carregarPagina(): void {
    const cliente = this.codCliente().trim();
    if (!cliente) return;
    this.loading.set(true);
    this.error.set(null);
    this.searched.set(true);
    this.historyService
      .getByClient(cliente, {
        page: this.page(),
        pageSize: this.pageSize,
        codRegua: this.reguaFiltro() === 'todas' ? undefined : this.reguaFiltro(),
        status: this.statusFiltro() === 'todos' ? undefined : this.statusFiltro()
      })
      .subscribe({
        next: (pageData) => {
          this.loading.set(false);
          this.items.set(pageData.items ?? []);
          this.totalItems.set(pageData.totalItems ?? 0);
          this.totalPages.set(Math.max(1, pageData.totalPages ?? 1));
        },
        error: () => {
          this.loading.set(false);
          this.items.set([]);
          this.error.set('Não foi possível carregar o histórico deste cliente.');
        }
      });
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.carregarPagina();
  }

  statusLabel(s: string): string {
    return STATUS_LABEL[s as ApiHistoryStatus] ?? s;
  }

  statusBadge(s: string): string {
    return STATUS_BADGE[s as ApiHistoryStatus] ?? 'badge-gray';
  }

  registerStatusLabel(s: string): string {
    return REGISTER_STATUS_OPTIONS.find(o => o.value === s)?.label ?? s;
  }

  /** Mensagem de validação da API pro campo, se houver (ver `registerFieldErrors`). */
  fieldError(name: keyof RegistroForm): string | null {
    return this.registerFieldErrors()[name] ?? null;
  }

  formatDate(raw: string | null): string {
    if (!raw) return '—';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /** Monta "PREFIXO NUMTITULO/PARCELA TIPO" (ZRF_PREFIX/ZRF_NUM/ZRF_PARC/ZRF_TIPO) pra
   *  exibir na tabela e no detalhamento. '—' quando o item não tem título vinculado
   *  (ex: ações do tipo Sistema). */
  titulo(it: ApiHistoryItem): string {
    if (!it.prefixo && !it.numTitulo && !it.parcela && !it.tipoTitulo) return '—';
    const num = [it.prefixo, it.numTitulo].filter(Boolean).join(' ');
    const parcela = it.parcela ? '/' + it.parcela : '';
    const tipo = it.tipoTitulo ? ' ' + it.tipoTitulo : '';
    return `${num}${parcela}${tipo}`.trim() || '—';
  }

  /**
   * `observacao`/`retorno` vêm do Protheus com um bug de encoding conhecido: a string
   * (UTF-16) é relida como se fosse de 1 byte por caractere, e cada caractere real acaba
   * intercalado com um caractere nulo (U+0000) — por isso aparece "espaçado" na tela.
   * Removendo os nulos a string volta ao normal; não precisa de nenhuma outra conversão.
   */
  cleanText(text: string | null): string {
    if (!text) return '';
    return text.replace(/\u0000/g, '').trim();
  }

  abrirDetalhe(item: ApiHistoryItem): void {
    this.detalhe.set(item);
  }

  fecharDetalhe(): void {
    this.detalhe.set(null);
  }

  private blankRegistroForm(): RegistroForm {
    return {
      codCliente: this.codCliente().trim(),
      loja: '',
      codRegua: this.reguas()[0]?.codigo ?? '',
      seqEtapa: '',
      seqAcao: '',
      status: 'PROMESSA',
      dataPromessa: '',
      observacao: '',
      destino: '',
      prefixo: '',
      numTitulo: '',
      parcela: '',
      tipoTitulo: ''
    };
  }

  abrirRegistro(): void {
    this.registroForm = this.blankRegistroForm();
    this.registerErrors.set([]);
    this.registerFieldErrors.set({});
    this.showRegistro.set(true);
  }

  fecharRegistro(): void {
    this.showRegistro.set(false);
  }

  registrar(): void {
    const f = this.registroForm;
    this.registerFieldErrors.set({});
    if (!f.codCliente.trim() || !f.codRegua.trim() || !f.seqEtapa.trim() || !f.seqAcao.trim() || this.registering()) {
      this.registerErrors.set(['Preencha código do cliente, régua, etapa e ação.']);
      return;
    }
    if (f.status === 'PROMESSA' && !f.dataPromessa.trim()) {
      this.registerErrors.set(['Informe a data da promessa de pagamento.']);
      return;
    }

    this.registering.set(true);
    this.registerErrors.set([]);
    this.historyService
      .registerResult({
        codCliente: f.codCliente.trim(),
        loja: f.loja.trim() || null,
        codRegua: f.codRegua.trim(),
        seqEtapa: f.seqEtapa.trim(),
        seqAcao: f.seqAcao.trim(),
        status: f.status,
        dataPromessa: f.status === 'PROMESSA' ? f.dataPromessa.trim() : null,
        observacao: f.observacao.trim() || null,
        destino: f.destino.trim() || null,
        prefixo: f.prefixo.trim() || null,
        numTitulo: f.numTitulo.trim() || null,
        parcela: f.parcela.trim() || null,
        tipoTitulo: f.tipoTitulo.trim() || null
      })
      .subscribe({
        next: () => {
          this.registering.set(false);
          this.showRegistro.set(false);
          if (this.codCliente().trim() === f.codCliente.trim()) {
            this.carregarPagina();
          }
        },
        error: (err) => {
          this.registering.set(false);
          const { field, messages } = this.parseValidationErrors(err);
          this.registerFieldErrors.set(field);
          this.registerErrors.set(messages.length ? messages : ['Não foi possível registrar o contato.']);
        }
      });
  }

  /**
   * A API devolve erros de validação nesse formato (400):
   * [{ "ErrorMessage": "Código do cliente não pode ultrapassar 6 caracteres.", "PropertyName": "codCliente" }]
   * — às vezes embrulhado em `{ errors: [...] }`. Separamos em mensagens por campo (pra
   * destacar o input) e uma lista geral (pra mostrar tudo no banner do modal, garantindo que
   * nada fique escondido mesmo se o PropertyName não bater com nenhum campo do formulário).
   */
  private parseValidationErrors(err: unknown): { field: Record<string, string>; messages: string[] } {
    const body = (err as any)?.error;
    const list: any[] | null = Array.isArray(body) ? body : Array.isArray(body?.errors) ? body.errors : null;

    if (!list || !list.length) {
      const fallback = (err as any)?.error?.message || (err as any)?.message;
      return { field: {}, messages: fallback ? [fallback] : [] };
    }

    const field: Record<string, string> = {};
    const messages: string[] = [];
    for (const item of list) {
      const msg: string | undefined = item?.ErrorMessage || item?.errorMessage || item?.message;
      const prop: string | undefined = item?.PropertyName || item?.propertyName || item?.field;
      if (!msg) continue;
      messages.push(msg);
      if (prop) {
        const key = prop.charAt(0).toLowerCase() + prop.slice(1);
        field[key] = msg;
      }
    }
    return { field, messages };
  }
}
