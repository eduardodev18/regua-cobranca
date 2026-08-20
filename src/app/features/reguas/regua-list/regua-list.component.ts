import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { CollectionRulesService } from '../../../core/services/collection-rules.service';
import { CollectionActionTypesService } from '../../../core/services/collection-action-types.service';
import { CollectionTemplatesService } from '../../../core/services/collection-templates.service';
import { mapApiRuleToRegua, mapReguaToHeaderPayload } from '../../../core/services/regua-mapper';
import { formatMoneyBRL, parseMoneyInput } from '../../../core/services/money';
import { brDateToIso, isoDateToBr } from '../../../core/services/protheus-mappers';
import { Regua, TipoCliente } from '../../../core/models';
import { ApiActionType, ApiTemplate } from '../../../core/models/api-catalog.model';
import { ApiRuleStepPayload } from '../../../core/models/api-rules.model';

interface PrimeiraEtapaForm {
  diaRelativo: number;
  canal: string;
  codAcao: string;
  codTemplate: string;
  horaInicio: string;
  horaFim: string;
}

@Component({
  selector: 'app-regua-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ModalComponent],
  templateUrl: './regua-list.component.html',
  styleUrl: './regua-list.component.css'
})
export class ReguaListComponent implements OnInit {
  private service = inject(CollectionRulesService);
  private actionTypesService = inject(CollectionActionTypesService);
  private templatesService = inject(CollectionTemplatesService);

  search = signal('');
  page = signal(1);
  pageSize = 5;

  reguas = signal<Regua[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  saving = signal(false);
  saveError = signal<string | null>(null);

  tiposAcao = signal<ApiActionType[]>([]);
  templates = signal<ApiTemplate[]>([]);

  showModal = signal(false);
  showFiltros = signal(false);
  openMenuFor = signal<string | null>(null);
  editingCodigo: string | null = null;

  filtroAtiva = signal<'todas' | 'sim' | 'nao'>('todas');
  filtroTipo = signal<'todos' | TipoCliente>('todos');

  // `canaisDisponiveis` precisa estar declarado ANTES de `form`/`primeiraEtapa` abaixo:
  // inicializadores de campo rodam na ordem de declaração da classe, e blankPrimeiraEtapa()
  // já lê `this.canaisDisponiveis()` na construção do componente.
  canaisDisponiveis = computed(() => {
    const set = new Set(this.tiposAcao().map(t => t.canal));
    return Array.from(set).sort();
  });

  form: Regua = this.blankForm();
  primeiraEtapa: PrimeiraEtapaForm = this.blankPrimeiraEtapa();

  ngOnInit(): void {
    this.load();
    // Necessários pra montar o seletor da 1ª etapa exigida na criação (a API cria régua+etapa numa transação só).
    this.actionTypesService.list().subscribe({ next: (data) => this.tiposAcao.set(data) });
    this.templatesService.list().subscribe({ next: (data) => this.templates.set(data) });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.list().subscribe({
      next: (data) => {
        this.loading.set(false);
        this.reguas.set(data.map(mapApiRuleToRegua));
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Não foi possível carregar as réguas.');
      }
    });
  }

  tiposAcaoDoCanal(canal: string) {
    return this.tiposAcao().filter(t => t.canal === canal);
  }

  templatesDoCanal(canal: string) {
    return this.templates().filter(t => t.canal === canal);
  }

  filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const ativa = this.filtroAtiva();
    const tipo = this.filtroTipo();
    return this.reguas().filter(r => {
      const matchesTerm = !term || r.codigo.toLowerCase().includes(term) || r.descricao.toLowerCase().includes(term);
      const matchesAtiva = ativa === 'todas' || (ativa === 'sim' ? r.ativa : !r.ativa);
      const matchesTipo = tipo === 'todos' || r.tipoCliente === tipo;
      return matchesTerm && matchesAtiva && matchesTipo;
    }).sort((a, b) => a.prioridade - b.prioridade);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));

  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  blankForm(): Regua {
    return {
      codigo: '', descricao: '', ativa: true, prioridade: 10,
      dtInicio: '01/01/2026', dtFim: '31/12/2026', tipoCliente: 'PF',
      valorMin: 0, valorMax: 0, permiteJuridico: false, permiteBloqueio: false, observacoes: ''
    };
  }

  blankPrimeiraEtapa(): PrimeiraEtapaForm {
    const canal = this.canaisDisponiveis()[0] ?? '';
    return {
      diaRelativo: 0,
      canal,
      codAcao: this.tiposAcaoDoCanal(canal)[0]?.codigo ?? '',
      codTemplate: this.templatesDoCanal(canal)[0]?.codigo ?? '',
      horaInicio: '08:00',
      horaFim: '18:00'
    };
  }

  onPrimeiraEtapaCanalChange(): void {
    this.primeiraEtapa.codAcao = this.tiposAcaoDoCanal(this.primeiraEtapa.canal)[0]?.codigo ?? '';
    this.primeiraEtapa.codTemplate = this.templatesDoCanal(this.primeiraEtapa.canal)[0]?.codigo ?? '';
  }

  openNew() {
    this.editingCodigo = null;
    this.form = this.blankForm();
    this.primeiraEtapa = this.blankPrimeiraEtapa();
    this.saveError.set(null);
    this.showModal.set(true);
  }

  openEdit(r: Regua) {
    this.editingCodigo = r.codigo;
    this.form = { ...r };
    this.saveError.set(null);
    this.openMenuFor.set(null);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  save() {
    if (!this.form.descricao.trim() || this.saving()) return;
    this.saving.set(true);
    this.saveError.set(null);

    if (this.editingCodigo) {
      this.service.updateHeader(this.editingCodigo, mapReguaToHeaderPayload(this.form)).subscribe({
        next: () => { this.saving.set(false); this.showModal.set(false); this.load(); },
        error: () => { this.saving.set(false); this.saveError.set('Não foi possível salvar a régua.'); }
      });
      return;
    }

    if (!this.primeiraEtapa.canal || !this.primeiraEtapa.codAcao || !this.primeiraEtapa.codTemplate) {
      this.saving.set(false);
      this.saveError.set('Configure a 1ª etapa da régua (canal, ação e template) — a API exige ao menos uma etapa na criação.');
      return;
    }

    const step: ApiRuleStepPayload = {
      diaRelativo: this.primeiraEtapa.diaRelativo,
      canal: this.primeiraEtapa.canal,
      codAcao: this.primeiraEtapa.codAcao,
      codTemplate: this.primeiraEtapa.codTemplate,
      horaInicio: this.primeiraEtapa.horaInicio || null,
      horaFim: this.primeiraEtapa.horaFim || null,
      ativo: '1'
    };

    this.service.create({ ...mapReguaToHeaderPayload(this.form), steps: [step] }).subscribe({
      next: () => { this.saving.set(false); this.showModal.set(false); this.load(); },
      error: () => { this.saving.set(false); this.saveError.set('Não foi possível criar a régua.'); }
    });
  }

  remove(r: Regua) {
    this.openMenuFor.set(null);
    if (!confirm(`Excluir a régua ${r.codigo} - ${r.descricao}? As etapas dela também serão removidas.`)) return;
    this.service.remove(r.codigo).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Não foi possível excluir a régua.')
    });
  }

  /** Posição do menu de ações (kebab), calculada em JS a partir do botão clicado —
   *  precisa ser `position: fixed` porque a tabela tem overflow-x: auto, que corta
   *  qualquer dropdown `position: absolute` dentro dela. Ver .dropdown-fixed em styles.css. */
  menuPos = signal<{ top: number; left: number } | null>(null);

  toggleMenu(codigo: string, event: MouseEvent) {
    if (this.openMenuFor() === codigo) {
      this.openMenuFor.set(null);
      this.menuPos.set(null);
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.menuPos.set({ top: rect.bottom + 6, left: rect.right - 190 });
    this.openMenuFor.set(codigo);
  }

  toggleAtiva(r: Regua) {
    this.openMenuFor.set(null);
    const atualizado = { ...r, ativa: !r.ativa };
    this.service.updateHeader(r.codigo, mapReguaToHeaderPayload(atualizado)).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Não foi possível atualizar o status da régua.')
    });
  }

  goToPage(p: number) {
    if (p >= 1 && p <= this.totalPages()) this.page.set(p);
  }

  money(v: number) {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ---- Máscara monetária dos campos Valor Mínimo/Máximo do formulário ----
  // Exibição controlada: o texto do input é sempre recalculado a partir de `form.valorMin`/
  // `valorMax` (números, é o que vai pro payload da API sem alteração nenhuma) — digitar só
  // reinterpreta os dígitos como centavos, ver `parseMoneyInput`.
  valorMinDisplay(): string {
    return formatMoneyBRL(this.form.valorMin);
  }

  valorMaxDisplay(): string {
    return formatMoneyBRL(this.form.valorMax);
  }

  onValorMinChange(raw: string): void {
    this.form.valorMin = parseMoneyInput(raw);
  }

  onValorMaxChange(raw: string): void {
    this.form.valorMax = parseMoneyInput(raw);
  }

  // ---- Datepicker nativo dos campos Data Início/Fim ----
  // `form.dtInicio`/`dtFim` continuam em dd/mm/aaaa internamente (mesmo formato usado pelo
  // resto da tela e por `mapReguaToHeaderPayload`) — só convertemos pra yyyy-MM-dd (formato
  // que o <input type="date"> exige) na hora de exibir/receber do datepicker.
  get dtInicioPicker(): string {
    return brDateToIso(this.form.dtInicio);
  }

  set dtInicioPicker(v: string) {
    this.form.dtInicio = isoDateToBr(v);
  }

  get dtFimPicker(): string {
    return brDateToIso(this.form.dtFim);
  }

  set dtFimPicker(v: string) {
    this.form.dtFim = isoDateToBr(v);
  }
}
