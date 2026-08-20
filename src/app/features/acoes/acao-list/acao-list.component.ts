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
import { ApiRuleAction, ApiRuleActionPayload, ApiRuleStep } from '../../../core/models/api-rules.model';

/** Ação extra da etapa. A API não tem descrição livre nem "condição de disparo" — só
 *  tipo de ação, template e prazo (dias). */
interface AcaoView {
  seqAcao: string;
  tipo: string;
  template: string;
  prazo: number;
  ativo: boolean;
}

interface AcaoForm {
  tipo: string;
  template: string;
  prazo: number;
  ativo: boolean;
}

function toAcaoView(a: ApiRuleAction): AcaoView {
  return { seqAcao: a.sequencia, tipo: a.tipoAcao, template: a.codTemplate, prazo: a.prazo, ativo: flagToBool(a.ativo) };
}

@Component({
  selector: 'app-acao-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ModalComponent],
  templateUrl: './acao-list.component.html',
  styleUrl: './acao-list.component.css'
})
export class AcaoListComponent implements OnChanges {
  @Input() codigo = '';
  @Input() seq = '';

  private service = inject(CollectionRulesService);
  private actionTypesService = inject(CollectionActionTypesService);
  private templatesService = inject(CollectionTemplatesService);

  showModal = signal(false);
  editingSeqAcao: string | null = null;

  regua = signal<Regua | null>(null);
  etapa = signal<ApiRuleStep | null>(null);
  acoes = signal<AcaoView[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  saving = signal(false);
  saveError = signal<string | null>(null);

  // `tiposAcao`/`templates` precisam estar declarados ANTES de `form` abaixo:
  // inicializadores de campo rodam na ordem de declaração da classe, e blankForm() já lê
  // `this.tiposAcao()`/`this.templates()` na construção do componente.
  tiposAcao = signal<ApiActionType[]>([]);
  templates = signal<ApiTemplate[]>([]);

  form: AcaoForm = this.blankForm();

  ngOnChanges(): void {
    if (!this.codigo || !this.seq) return;
    this.load();
    this.actionTypesService.list().subscribe({ next: (data) => this.tiposAcao.set(data) });
    this.templatesService.list().subscribe({ next: (data) => this.templates.set(data) });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.get(this.codigo).subscribe({
      next: (rule) => {
        this.regua.set(mapApiRuleToRegua(rule));
        const step = rule.steps.find(s => s.sequencia === this.seq) ?? null;
        this.etapa.set(step);
        if (!step) {
          this.loading.set(false);
          return;
        }
        this.service.listActions(this.codigo, this.seq).subscribe({
          next: (actions) => {
            this.loading.set(false);
            this.acoes.set(actions.map(toAcaoView).sort((a, b) => a.seqAcao.localeCompare(b.seqAcao)));
          },
          error: () => {
            this.loading.set(false);
            this.error.set('Não foi possível carregar as ações da etapa.');
          }
        });
      },
      error: () => {
        this.loading.set(false);
        this.regua.set(null);
        this.error.set('Não foi possível carregar a régua.');
      }
    });
  }

  tipoCanal(codigo: string): string | undefined {
    return this.tiposAcao().find(t => t.codigo === codigo)?.canal;
  }

  templatesDoTipo(tipoAcao: string) {
    const canal = this.tipoCanal(tipoAcao);
    return canal ? this.templates().filter(t => t.canal === canal) : this.templates();
  }

  tipoDescricao(codigo: string) {
    return this.tiposAcao().find(t => t.codigo === codigo)?.descricao ?? codigo;
  }

  blankForm(): AcaoForm {
    const tipo = this.tiposAcao()[0]?.codigo ?? '';
    return { tipo, template: this.templatesDoTipo(tipo)[0]?.codigo ?? '', prazo: 0, ativo: true };
  }

  onTipoChange(): void {
    this.form.template = this.templatesDoTipo(this.form.tipo)[0]?.codigo ?? '';
  }

  openNew() {
    this.editingSeqAcao = null;
    this.form = this.blankForm();
    this.saveError.set(null);
    this.showModal.set(true);
  }

  openEdit(a: AcaoView) {
    this.editingSeqAcao = a.seqAcao;
    this.form = { tipo: a.tipo, template: a.template, prazo: a.prazo, ativo: a.ativo };
    this.saveError.set(null);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  save() {
    if (!this.form.tipo || this.saving()) return;
    const payload: ApiRuleActionPayload = {
      tipoAcao: this.form.tipo,
      codTemplate: this.form.template,
      prazo: this.form.prazo,
      ativo: this.form.ativo ? '1' : '2'
    };

    this.saving.set(true);
    this.saveError.set(null);
    const req = this.editingSeqAcao
      ? this.service.updateAction(this.codigo, this.seq, this.editingSeqAcao, payload)
      : this.service.addAction(this.codigo, this.seq, payload);

    req.subscribe({
      next: () => { this.saving.set(false); this.showModal.set(false); this.load(); },
      error: () => { this.saving.set(false); this.saveError.set('Não foi possível salvar a ação.'); }
    });
  }

  remove(a: AcaoView) {
    if (!confirm(`Excluir a ação ${a.seqAcao}?`)) return;
    this.service.removeAction(this.codigo, this.seq, a.seqAcao).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Não foi possível excluir a ação.')
    });
  }

  diaLabel(dia: number) {
    return dia === 0 ? 'D+0' : dia > 0 ? `D+${dia}` : `D${dia}`;
  }
}
