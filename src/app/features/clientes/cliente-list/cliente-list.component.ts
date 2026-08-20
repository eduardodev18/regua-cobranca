import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MockDataService } from '../../../core/services/mock-data.service';
import { computeClientesResumo } from '../../../core/services/carteira-calc';

/**
 * ⚠️ MOCK — a lista de clientes é derivada em memória (computeClientesResumo) a partir
 * de MockDataService.carteira()/execucoes(). Não existe endpoint de Clientes/Fornecedores
 * na API real ainda — ver pedido em PENDENCIAS_BACKEND.md.
 */
@Component({
  selector: 'app-cliente-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cliente-list.component.html',
  styleUrl: './cliente-list.component.css'
})
export class ClienteListComponent {
  search = signal('');
  tipo = signal<'todos' | 'PF' | 'PJ'>('todos');
  soComAtraso = signal(false);

  page = signal(1);
  pageSize = 10;

  constructor(public data: MockDataService) {}

  clientes = computed(() => computeClientesResumo(this.data.carteira(), this.data.execucoes()));

  filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const tipo = this.tipo();
    const soAtraso = this.soComAtraso();
    return this.clientes().filter(c => {
      const matchesTerm = !term || c.cliente.toLowerCase().includes(term);
      const matchesTipo = tipo === 'todos' || c.tipo === tipo;
      const matchesAtraso = !soAtraso || c.temAtraso;
      return matchesTerm && matchesTipo && matchesAtraso;
    });
  });

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
    this.tipo.set('todos');
    this.soComAtraso.set(false);
    this.resetPage();
  }

  money(v: number) {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
