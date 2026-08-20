import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { CollectionTemplatesService } from '../../../core/services/collection-templates.service';
import { ApiTemplate, ApiTemplatePayload } from '../../../core/models/api-catalog.model';
import { Canal } from '../../../core/models';

// A API usa os mesmos códigos de canal do catálogo de Tipos de Ação (EMAIL/WPP/SMS).
// Telefone/Sistema não têm template (não fazem sentido pra mensagem), por isso saíram
// das opções desta tela (diferente da versão mock, que listava os 5 canais do app).
const CANAL_LABEL_TO_API: Record<string, string> = { 'E-mail': 'EMAIL', 'WhatsApp': 'WPP', 'SMS': 'SMS' };
const CANAL_API_TO_LABEL: Record<string, Canal> = { EMAIL: 'E-mail', WPP: 'WhatsApp', SMS: 'SMS' };

function canalToLabel(canalApi: string): Canal {
  return CANAL_API_TO_LABEL[canalApi] ?? (canalApi as Canal);
}

interface TemplateForm {
  descricao: string;
  canal: Canal;
  assunto: string;
  corpo: string;
  ativo: boolean;
}

@Component({
  selector: 'app-template-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ModalComponent],
  templateUrl: './template-list.component.html',
  styleUrl: './template-list.component.css'
})
export class TemplateListComponent implements OnInit {
  private service = inject(CollectionTemplatesService);

  search = signal('');
  canalFiltro = signal<'Todos' | Canal>('Todos');
  canais: Canal[] = ['E-mail', 'WhatsApp', 'SMS'];

  templates = signal<ApiTemplate[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  saving = signal(false);
  saveError = signal<string | null>(null);

  showModal = signal(false);
  showPreview = signal(false);
  openMenuFor = signal<string | null>(null);
  previewTemplate: ApiTemplate | null = null;
  editingCodigo: string | null = null;
  form: TemplateForm = this.blankForm();

  // ---- Corpo da mensagem: editor de texto rico (HTML) só pro E-mail — WhatsApp e SMS não
  // renderizam HTML de verdade, então usam texto puro com marcadores de markdown simples
  // (o mesmo estilo que o WhatsApp já reconhece nativamente: *negrito*, _itálico_, ~riscado~,
  // ```monoespaçado```) — mais os variáveis clicáveis, que funcionam nos dois casos. ----
  variaveis: string[] = ['cliente', 'valor', 'titulo'];
  /** Conteúdo inicial do editor rico — setado só na abertura do modal (openNew/openEdit).
   *  Ligado ao [innerHTML] do contenteditable via binding "estático" de propósito: se
   *  ficasse amarrado direto a `form.corpo`, o Angular reescreveria o innerHTML a cada tecla
   *  digitada (change detection) e o cursor voltaria pro início. */
  editorSeed = '';
  @ViewChild('corpoEditor') corpoEditorRef?: ElementRef<HTMLDivElement>;
  @ViewChild('corpoTextarea') corpoTextareaRef?: ElementRef<HTMLTextAreaElement>;

  /** Só o E-mail usa o editor rico (HTML) — WhatsApp/SMS usam textarea + markdown simples. */
  get isRichEditor(): boolean {
    return this.form.canal === 'E-mail';
  }

  get corpoPlaceholder(): string {
    return 'Use variáveis como ' + this.variaveis.map(v => this.wrapVar(v)).join(', ');
  }

  /** Marcador de texto monoespaçado no markdown do WhatsApp — em constante (não direto no
   *  template) só pra não ter crase dentro de uma expressão de template Angular. */
  readonly mdMonoMarker = '```';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.list().subscribe({
      next: (data) => {
        this.loading.set(false);
        this.templates.set(data);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Não foi possível carregar os templates.');
      }
    });
  }

  canalLabel(t: ApiTemplate): Canal {
    return canalToLabel(t.canal);
  }

  filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const canal = this.canalFiltro();
    return this.templates().filter(t => {
      const matchesTerm = !term || t.codigo.toLowerCase().includes(term) || t.descricao.toLowerCase().includes(term);
      const matchesCanal = canal === 'Todos' || this.canalLabel(t) === canal;
      return matchesTerm && matchesCanal;
    });
  });

  blankForm(): TemplateForm {
    return { descricao: '', canal: 'E-mail', assunto: '', corpo: '', ativo: true };
  }

  openNew() {
    this.editingCodigo = null;
    this.form = this.blankForm();
    this.editorSeed = this.form.corpo;
    this.saveError.set(null);
    this.showModal.set(true);
  }

  openEdit(t: ApiTemplate) {
    this.editingCodigo = t.codigo;
    // `cleanHtml` aqui também lava templates salvos antes dessa correção, que podem ter
    // ficado com o caractere invisível gravado no corpo (ver cleanHtml).
    const corpoLimpo = this.cleanHtml(t.corpo);
    this.form = {
      descricao: t.descricao,
      canal: this.canalLabel(t),
      assunto: t.assunto ?? '',
      corpo: corpoLimpo,
      ativo: t.ativo === '1'
    };
    this.editorSeed = corpoLimpo;
    this.saveError.set(null);
    this.openMenuFor.set(null);
    this.showModal.set(true);
  }

  onCanalSelect(canal: Canal): void {
    this.form.canal = canal;
  }

  wrapVar(token: string): string {
    return '{{' + token + '}}';
  }

  /** Insere a variável na posição do cursor — no editor rico (E-mail) ou no textarea de
   *  markdown (WhatsApp/SMS), conforme o canal atual. */
  insertVariable(token: string): void {
    const placeholder = this.wrapVar(token);
    if (this.isRichEditor) {
      this.exec('insertText', placeholder);
    } else {
      this.insertIntoTextarea(placeholder);
    }
  }

  onEditorInput(event: Event): void {
    this.form.corpo = this.cleanHtml((event.target as HTMLElement).innerHTML);
  }

  /** Comandos da barra de ferramentas do editor rico (negrito, itálico, listas, etc.) —
   *  usa `document.execCommand`, suficiente pra formatação básica sem puxar nenhuma lib
   *  externa de editor de texto pro projeto. Só usado pro E-mail. */
  exec(command: string, value?: string): void {
    const el = this.corpoEditorRef?.nativeElement;
    if (!el) return;
    el.focus();
    document.execCommand(command, false, value);
    this.form.corpo = this.cleanHtml(el.innerHTML);
  }

  insertLink(): void {
    const url = window.prompt('URL do link:', 'https://');
    if (url) this.exec('createLink', url);
  }

  /** Envolve o texto selecionado do textarea (WhatsApp/SMS) com marcadores de markdown —
   *  ex: `mdWrap('*')` em cima de "oi" vira "*oi*". Sem seleção, insere os marcadores vazios
   *  com o cursor entre eles, pronto pra digitar. */
  mdWrap(marker: string, markerEnd: string = marker): void {
    this.insertIntoTextarea(marker, markerEnd);
  }

  /** Insere/envolve texto no textarea de corpo (canais WhatsApp/SMS) na posição do cursor —
   *  usado tanto pelas variáveis clicáveis quanto pelos botões de markdown. */
  private insertIntoTextarea(before: string, after: string = ''): void {
    const ta = this.corpoTextareaRef?.nativeElement;
    if (!ta) {
      this.form.corpo += before + after;
      return;
    }
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    const selected = ta.value.slice(start, end);
    this.form.corpo = ta.value.slice(0, start) + before + selected + after + ta.value.slice(end);
    // Reposiciona o cursor depois do texto inserido (ou entre os marcadores, se não havia
    // seleção), no próximo tick, depois do Angular atualizar o value via ngModel.
    const cursorPos = selected ? start + before.length + selected.length + after.length : start + before.length;
    queueMicrotask(() => {
      ta.focus();
      ta.setSelectionRange(cursorPos, cursorPos);
    });
  }

  /** Conversão simples do markdown do WhatsApp pra HTML — só pra pré-visualização (o corpo
   *  salvo continua em texto puro com os marcadores, que é o que efetivamente vai pro canal).
   *  Cobre os 4 marcadores que o WhatsApp reconhece nativamente. */
  markdownToPreviewHtml(text: string): string {
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return escaped
      .replace(/```([^`]+)```/g, '<code>$1</code>')
      .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      .replace(/~([^~]+)~/g, '<s>$1</s>')
      .replace(/\n/g, '<br>');
  }

  /** Chrome/Edge injetam caracteres invisíveis (zero-width space/no-break) no HTML do
   *  contenteditable como "âncora" quando um comando de formatação (ex: negrito) é aplicado
   *  sem seleção de texto — sem limpar isso, esse lixo invisível vai pro corpo salvo e, ao
   *  reabrir o template, algumas fontes/telas chegam a renderizar como um glifo de erro
   *  (ex: "<�b>" em vez de "<b>"). Tira esses caracteres toda vez que lemos o innerHTML. */
  private cleanHtml(html: string): string {
    let result = html;
    for (const code of TemplateListComponent.INVISIBLE_CHAR_CODES) {
      result = result.split(String.fromCharCode(code)).join('');
    }
    return result;
  }

  /** Zero-width space (200B), zero-width non-joiner (200C), zero-width joiner (200D) e
   *  BOM/zero-width no-break space (FEFF) — códigos em hex, construídos via
   *  `String.fromCharCode` em `cleanHtml` pra não ter caractere invisível literal no
   *  código-fonte (difícil de revisar/editar depois). */
  private static readonly INVISIBLE_CHAR_CODES = [0x200b, 0x200c, 0x200d, 0xfeff];

  /** Prévia em texto puro do corpo, usada na tabela — pro canal E-mail o corpo é HTML, então
   *  tira as tags pra não mostrar `<b>`/`<div>` cru na listagem. WhatsApp/SMS já são texto
   *  puro com marcadores de markdown, mostra direto. */
  bodyPreview(t: ApiTemplate): string {
    if (this.canalLabel(t) !== 'E-mail') return t.corpo;
    return t.corpo.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  openPreview(t: ApiTemplate) {
    this.previewTemplate = t;
    this.showPreview.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  save() {
    if (!this.form.descricao.trim() || this.saving()) return;
    const payload: ApiTemplatePayload = {
      descricao: this.form.descricao.trim(),
      canal: CANAL_LABEL_TO_API[this.form.canal] ?? this.form.canal,
      assunto: this.form.assunto.trim() || null,
      corpo: this.form.corpo,
      ativo: this.form.ativo ? '1' : '2'
    };

    this.saving.set(true);
    this.saveError.set(null);
    const onSuccess = () => {
      this.saving.set(false);
      this.showModal.set(false);
      this.load();
    };
    const onError = () => {
      this.saving.set(false);
      this.saveError.set('Não foi possível salvar o template.');
    };

    if (this.editingCodigo) {
      this.service.update(this.editingCodigo, payload).subscribe({ next: onSuccess, error: onError });
    } else {
      this.service.create(payload).subscribe({ next: onSuccess, error: onError });
    }
  }

  remove(t: ApiTemplate) {
    this.openMenuFor.set(null);
    if (!confirm(`Excluir o template ${t.codigo} - ${t.descricao}?`)) return;
    this.service.remove(t.codigo).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Não foi possível excluir o template.')
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
}
