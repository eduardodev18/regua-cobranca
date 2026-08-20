import { Component, Input, OnChanges, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { CollectionRulesService } from '../../../core/services/collection-rules.service';
import { CollectionActionTypesService } from '../../../core/services/collection-action-types.service';
import { CollectionTemplatesService } from '../../../core/services/collection-templates.service';
import { mapApiRuleToRegua } from '../../../core/services/regua-mapper';
import { flagToBool } from '../../../core/services/protheus-mappers';
import { Regua } from '../../../core/models';
import { ApiActionType, ApiTemplate } from '../../../core/models/api-catalog.model';
import { ApiRuleStep, ApiRuleStepPayload } from '../../../core/models/api-rules.model';

/** Etapa exibida na tela. A API não tem campo de descrição livre para o step — o rótulo
 *  é sintetizado a partir de dia relativo + canal + ação. */
interface EtapaView {
  seq: string;
  diaRelativo: number;
  canal: string;
  tipoAcao: string;
  template: string;
  horaIni: string;
  horaFim: string;
  ativo: boolean;
}

interface EtapaForm {
  diaRelativo: number;
  canal: string;
  tipoAcao: string;
  template: string;
  horaIni: string;
  horaFim: string;
  ativo: boolean;
}

function toEtapaView(s: ApiRuleStep): EtapaView {
  return {
    seq: s.sequencia,
    diaRelativo: s.diaRelativo,
    canal: s.canal,
    tipoAcao: s.codAcao,
    template: s.codTemplate,
    horaIni: s.horaInicio ?? '',
    horaFim: s.horaFim ?? '',
    ativo: flagToBool(s.ativo)
  };
}

@Component({
  selector: 'app-etapa-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ModalComponent],
  templateUrl: './etapa-list.component.html',
  styleUrl: './etapa-list.component.css'
})
export class EtapaListComponent implements OnChanges {
  @Input() codigo = '';

  private service = inject(CollectionRulesService);
  private actionTypesService = inject(CollectionActionTypesService);
  private templatesService = inject(CollectionTemplatesService);

  tab = signal<'geral' | 'config'>('geral');
  showModal = signal(false);
  editingSeq: string | null = null;

  regua = signal<Regua | null>(null);
  etapas = signal<EtapaView[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  saving = signal(false);
  saveError = signal<string | null>(null);

  tiposAcao = signal<ApiActionType[]>([]);
  templates = signal<ApiTemplate[]>([]);

  // `canaisDisponiveis` precisa estar declarado ANTES de `form` abaixo: inicializadores de
  // campo rodam na ordem de declaração da classe, e blankForm() já lê `this.canaisDisponiveis()`.
  canaisDisponiveis = computed(() => {
    const set = new Set(this.tiposAcao().map(t => t.canal));
    return Array.from(set).sort();
  });

  form: EtapaForm = this.blankForm();

  ngOnChanges(): void {
    if (!this.codigo) return;
    this.load();
    this.actionTypesService.list().subscribe({ next: (data) => this.tiposAcao.set(data) });
    this.templatesService.list().subscribe({ next: (data) => this.templates.set(data) });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.get(this.codigo).subscribe({
      next: (rule) => {
        this.loading.set(false);
        this.regua.set(mapApiRuleToRegua(rule));
        this.etapas.set(rule.steps.map(toEtapaView).sort((a, b) => a.seq.localeCompare(b.seq)));
      },
      error: () => {
        this.loading.set(false);
        this.regua.set(null);
        this.error.set('Não foi possível carregar a régua.');
      }
    });
  }

  tiposAcaoDoCanal(canal: string) {
    return this.tiposAcao().filter(t => t.canal === canal);
  }

  templatesDoCanal(canal: string) {
    return this.templates().filter(t => t.canal === canal);
  }

  blankForm(): EtapaForm {
    const canal = this.canaisDisponiveis()[0] ?? '';
    return {
      diaRelativo: 0,
      canal,
      tipoAcao: this.tiposAcaoDoCanal(canal)[0]?.codigo ?? '',
      template: this.templatesDoCanal(canal)[0]?.codigo ?? '',
      horaIni: '08:00',
      horaFim: '18:00',
      ativo: true
    };
  }

  onCanalChange(): void {
    this.form.tipoAcao = this.tiposAcaoDoCanal(this.form.canal)[0]?.codigo ?? '';
    this.form.template = this.templatesDoCanal(this.form.canal)[0]?.codigo ?? '';
  }

  openNew() {
    this.editingSeq = null;
    this.form = this.blankForm();
    this.saveError.set(null);
    this.showModal.set(true);
  }

  openEdit(e: EtapaView) {
    this.editingSeq = e.seq;
    this.form = {
      diaRelativo: e.diaRelativo, canal: e.canal, tipoAcao: e.tipoAcao,
      template: e.template, horaIni: e.horaIni, horaFim: e.horaFim, ativo: e.ativo
    };
    this.saveError.set(null);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  save() {
    if (!this.form.canal || !this.form.tipoAcao || this.saving()) return;
    const payload: ApiRuleStepPayload = {
      diaRelativo: this.form.diaRelativo,
      canal: this.form.canal,
      codAcao: this.form.tipoAcao,
      codTemplate: this.form.template,
      horaInicio: this.form.horaIni || null,
      horaFim: this.form.horaFim || null,
      ativo: this.form.ativo ? '1' : '2'
    };

    this.saving.set(true);
    this.saveError.set(null);
    const req = this.editingSeq
      ? this.service.updateStep(this.codigo, this.editingSeq, payload)
      : this.service.addStep(this.codigo, payload);

    req.subscribe({
      next: () => { this.saving.set(false); this.showModal.set(false); this.load(); },
      error: () => { this.saving.set(false); this.saveError.set('Não foi possível salvar a etapa.'); }
    });
  }

  remove(e: EtapaView) {
    if (!confirm(`Excluir a etapa ${e.seq}?`)) return;
    this.service.removeStep(this.codigo, e.seq).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Não foi possível excluir a etapa.')
    });
  }

  diaLabel(dia: number) {
    return dia === 0 ? 'D+0' : dia > 0 ? `D+${dia}` : `D${dia}`;
  }

  /** Rótulo sintetizado — a API não tem campo de descrição livre pra etapa. */
  stepLabel(e: EtapaView): string {
    return `${this.diaLabel(e.diaRelativo)} · ${e.canal} · ${e.tipoAcao}`;
  }
}
