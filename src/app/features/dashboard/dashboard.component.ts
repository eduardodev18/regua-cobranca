import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MockDataService } from '../../core/services/mock-data.service';
import {
  computeCarteiraKpis, computeEfetividadePorRegua, computeFunil,
  filtrarExecucoesPorPeriodo, filtrarTitulos
} from '../../core/services/carteira-calc';
import { Canal, CarteiraFiltro, FILIAIS, RESPONSAVEIS, StatusExecucao, UNIDADES_NEGOCIO } from '../../core/models';

/**
 * ⚠️ MOCK — depende de MockDataService.carteira()/execucoes() (Títulos e Histórico),
 * que a API ainda não cobre (ver PENDENCIAS_BACKEND.md). Por consequência, `data.reguas()`
 * e `data.getEtapasByRegua()` usados aqui também são os dados de SEED do mock, não a
 * régua real cadastrada em /reguas — precisa migrar junto quando Títulos/Clientes
 * estiverem disponíveis.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  filiais = FILIAIS;
  unidadesNegocio = UNIDADES_NEGOCIO;
  responsaveis = RESPONSAVEIS;

  // ---- Filtros ----
  showFiltros = signal(true);
  periodoDe = signal('');
  periodoAte = signal('');
  filial = signal('todas');
  unidadeNegocio = signal('todas');
  responsavel = signal('todos');
  valorMin = signal<number | null>(null);
  valorMax = signal<number | null>(null);

  constructor(public data: MockDataService, private router: Router) {}

  filtroAtivo = computed<CarteiraFiltro>(() => ({
    periodoDe: this.periodoDe() || undefined,
    periodoAte: this.periodoAte() || undefined,
    filial: this.filial(),
    unidadeNegocio: this.unidadeNegocio(),
    responsavel: this.responsavel(),
    valorMin: this.valorMin() ?? undefined,
    valorMax: this.valorMax() ?? undefined,
  }));

  hasFiltrosAtivos = computed(() => {
    const f = this.filtroAtivo();
    return !!(f.periodoDe || f.periodoAte || (f.filial && f.filial !== 'todas') ||
      (f.unidadeNegocio && f.unidadeNegocio !== 'todas') || (f.responsavel && f.responsavel !== 'todos') ||
      f.valorMin != null || f.valorMax != null);
  });

  limparFiltros() {
    this.periodoDe.set('');
    this.periodoAte.set('');
    this.filial.set('todas');
    this.unidadeNegocio.set('todas');
    this.responsavel.set('todos');
    this.valorMin.set(null);
    this.valorMax.set(null);
  }

  // ---- Dados filtrados ----
  titulosFiltrados = computed(() => filtrarTitulos(this.data.carteira(), this.filtroAtivo()));

  execucoesFiltradas = computed(() => filtrarExecucoesPorPeriodo(this.data.execucoes(), this.periodoDe() || undefined, this.periodoAte() || undefined));

  carteiraKpis = computed(() => computeCarteiraKpis(this.titulosFiltrados(), this.data.PERIODO_DIAS_PADRAO));

  agingList = computed(() => {
    const { aging, carteiraEmAberto } = this.carteiraKpis();
    const total = carteiraEmAberto || 1;
    const buckets: { key: keyof typeof aging; label: string; color: string }[] = [
      { key: 'aVencer', label: 'A vencer', color: 'var(--blue)' },
      { key: 'd1_30', label: '1 - 30 dias', color: 'var(--green)' },
      { key: 'd31_60', label: '31 - 60 dias', color: 'var(--amber)' },
      { key: 'd61_90', label: '61 - 90 dias', color: '#f97316' },
      { key: 'd90mais', label: '90+ dias', color: 'var(--red)' },
    ];
    return buckets.map(b => ({
      bucket: b.key,
      label: b.label,
      color: b.color,
      valor: aging[b.key].valor,
      qtd: aging[b.key].qtd,
      pct: Math.round((aging[b.key].valor / total) * 100)
    }));
  });

  reguasResumo = computed(() => {
    const efetividade = computeEfetividadePorRegua(this.titulosFiltrados(), this.data.reguas());
    return efetividade.map(r => ({
      ...r,
      etapas: this.data.getEtapasByRegua(r.codigo).length
    }));
  });

  funil = computed(() => computeFunil(this.execucoesFiltradas(), this.titulosFiltrados()));

  motorStatus() {
    return this.data.motorStatus();
  }

  kpis() {
    return this.data.kpis();
  }

  canaisResumo = computed(() => {
    const exec = this.execucoesFiltradas();
    const canais: Canal[] = ['E-mail', 'WhatsApp', 'SMS', 'Telefone', 'Sistema'];
    const total = exec.length || 1;
    return canais.map(c => {
      const count = exec.filter(e => e.canal === c).length;
      return { canal: c, count, pct: Math.round((count / total) * 100) };
    }).sort((a, b) => b.count - a.count);
  });

  recentes = computed(() => this.data.execucoes().slice(0, 6));

  statusClass(s: StatusExecucao) {
    return s === 'Sucesso' ? 'badge-green' : s === 'Falha' ? 'badge-red' : s === 'Tentativa' ? 'badge-amber' : 'badge-gray';
  }

  barColor(s: StatusExecucao) {
    return s === 'Sucesso' ? 'var(--green)' : s === 'Falha' ? 'var(--red)' : s === 'Tentativa' ? 'var(--amber)' : 'var(--text-soft)';
  }

  motorBadgeClass(status: 'ok' | 'atencao' | 'critico') {
    return status === 'ok' ? 'badge-green' : status === 'atencao' ? 'badge-amber' : 'badge-red';
  }

  motorLabel(status: 'ok' | 'atencao' | 'critico') {
    return status === 'ok' ? 'Operando normalmente' : status === 'atencao' ? 'Atenção' : 'Crítico';
  }

  money(v: number) {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ---- Drill-down: todo número relevante leva para a lista de títulos filtrada ----
  irParaTitulos(extra: Record<string, string | number | undefined> = {}) {
    const f = this.filtroAtivo();
    const queryParams: Record<string, string> = {};
    if (f.periodoDe) queryParams['periodoDe'] = f.periodoDe;
    if (f.periodoAte) queryParams['periodoAte'] = f.periodoAte;
    if (f.filial && f.filial !== 'todas') queryParams['filial'] = f.filial;
    if (f.unidadeNegocio && f.unidadeNegocio !== 'todas') queryParams['unidadeNegocio'] = f.unidadeNegocio;
    if (f.responsavel && f.responsavel !== 'todos') queryParams['responsavel'] = f.responsavel;
    if (f.valorMin != null) queryParams['valorMin'] = String(f.valorMin);
    if (f.valorMax != null) queryParams['valorMax'] = String(f.valorMax);
    for (const [k, v] of Object.entries(extra)) {
      if (v !== undefined && v !== null && v !== '') queryParams[k] = String(v);
    }
    this.router.navigate(['/titulos'], { queryParams });
  }

  irParaHistorico(status?: string) {
    this.router.navigate(['/historico'], { queryParams: status ? { status } : {} });
  }
}
