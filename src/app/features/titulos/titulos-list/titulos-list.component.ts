import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MockDataService } from '../../../core/services/mock-data.service';
import { ModalComponent } from '../../../shared/modal/modal.component';
import {
  AGING_LABELS, AgingBucket, agingBucketDe, filtrarTitulos
} from '../../../core/services/carteira-calc';
import { CarteiraFiltro, FILIAIS, RESPONSAVEIS, StatusTitulo, TituloCarteira, UNIDADES_NEGOCIO } from '../../../core/models';

/**
 * ⚠️ MOCK — Carteira de Títulos inteira roda em cima de MockDataService.carteira(),
 * que é dado de SEED em memória. A API real (API_REGUA_COBRANCA.md) não tem endpoint de
 * Títulos a Receber — ver pedido em PENDENCIAS_BACKEND.md. `reguasDisponiveis` também
 * lê de `data.reguas()` (mock), não da régua real cadastrada em /reguas.
 */
@Component({
  selector: 'app-titulos-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ModalComponent],
  templateUrl: './titulos-list.component.html',
  styleUrl: './titulos-list.component.css'
})
export class TitulosListComponent {
  filiais = FILIAIS;
  unidadesNegocio = UNIDADES_NEGOCIO;
  responsaveis = RESPONSAVEIS;
  agingLabels = AGING_LABELS;

  search = signal('');
  regua = signal('todas');
  status = signal<'todos' | StatusTitulo>('todos');
  filial = signal('todas');
  unidadeNegocio = signal('todas');
  responsavel = signal('todos');
  valorMin = signal<number | null>(null);
  valorMax = signal<number | null>(null);
  periodoDe = signal('');
  periodoAte = signal('');
  aging = signal<AgingBucket | 'todas'>('todas');

  page = signal(1);
  pageSize = 8;

  detalhe = signal<TituloCarteira | null>(null);

  constructor(public data: MockDataService, route: ActivatedRoute) {
    const q = route.snapshot.queryParamMap;
    if (q.get('regua')) this.regua.set(q.get('regua')!);
    if (q.get('status')) this.status.set(q.get('status') as StatusTitulo);
    if (q.get('filial')) this.filial.set(q.get('filial')!);
    if (q.get('unidadeNegocio')) this.unidadeNegocio.set(q.get('unidadeNegocio')!);
    if (q.get('responsavel')) this.responsavel.set(q.get('responsavel')!);
    if (q.get('valorMin')) this.valorMin.set(Number(q.get('valorMin')));
    if (q.get('valorMax')) this.valorMax.set(Number(q.get('valorMax')));
    if (q.get('periodoDe')) this.periodoDe.set(q.get('periodoDe')!);
    if (q.get('periodoAte')) this.periodoAte.set(q.get('periodoAte')!);
    if (q.get('aging')) this.aging.set(q.get('aging') as AgingBucket);
    if (q.get('cliente')) this.search.set(q.get('cliente')!);
  }

  reguasDisponiveis = computed(() => this.data.reguas().map(r => r.codigo));

  filtroBase = computed<CarteiraFiltro>(() => ({
    regua: this.regua(),
    status: this.status(),
    filial: this.filial(),
    unidadeNegocio: this.unidadeNegocio(),
    responsavel: this.responsavel(),
    valorMin: this.valorMin() ?? undefined,
    valorMax: this.valorMax() ?? undefined,
    periodoDe: this.periodoDe() || undefined,
    periodoAte: this.periodoAte() || undefined,
  }));

  filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const aging = this.aging();
    return filtrarTitulos(this.data.carteira(), this.filtroBase()).filter(t => {
      const matchesTerm = !term || t.cliente.toLowerCase().includes(term) || t.titulo.toLowerCase().includes(term);
      const matchesAging = aging === 'todas' || agingBucketDe(t) === aging;
      return matchesTerm && matchesAging;
    });
  });

  totalValor = computed(() => this.filtered().reduce((s, t) => s + t.valor, 0));

  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));

  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  resetPage() {
    this.page.set(1);
  }

  goToPage(p: number) {
    if (p >= 1 && p <= this.totalPages()) this.page.set(p);
  }

  limparFiltros() {
    this.search.set('');
    this.regua.set('todas');
    this.status.set('todos');
    this.filial.set('todas');
    this.unidadeNegocio.set('todas');
    this.responsavel.set('todos');
    this.valorMin.set(null);
    this.valorMax.set(null);
    this.periodoDe.set('');
    this.periodoAte.set('');
    this.aging.set('todas');
    this.resetPage();
  }

  statusClass(s: StatusTitulo) {
    return s === 'Pago' ? 'badge-green' : s === 'Renegociado' ? 'badge-blue' : 'badge-amber';
  }

  agingLabel(t: TituloCarteira) {
    const b = agingBucketDe(t);
    return b ? this.agingLabels[b] : '—';
  }

  money(v: number) {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  exportar() {
    alert('Exportação simulada: ' + this.filtered().length + ' título(s) seriam exportados para CSV.');
  }
}
