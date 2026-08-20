import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MockDataService } from '../../../core/services/mock-data.service';
import { AuthService } from '../../../core/services/auth.service';
import { ModalComponent } from '../../../shared/modal/modal.component';
import { AGING_LABELS, agingBucketDe, computeClientesResumo, parseData } from '../../../core/services/carteira-calc';
import { Execucao, StatusExecucao, StatusTitulo, TituloCarteira } from '../../../core/models';

/**
 * ⚠️ MOCK — débitos e acionamentos vêm de MockDataService.carteira()/execucoes(),
 * filtrados por `nome` (nome do cliente, não um código). O histórico real
 * (CollectionHistoryService, já implementado) exige um `codCliente` que hoje não temos
 * de onde tirar — falta o domínio de Clientes/Fornecedores. Ver PENDENCIAS_BACKEND.md.
 */
@Component({
  selector: 'app-cliente-detalhe',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ModalComponent],
  templateUrl: './cliente-detalhe.component.html',
  styleUrl: './cliente-detalhe.component.css'
})
export class ClienteDetalheComponent {
  @Input() nome = '';

  agingLabels = AGING_LABELS;

  statusDebito = signal<'todos' | StatusTitulo>('todos');
  statusAcionamento = signal<'todos' | StatusExecucao>('todos');

  detalheTitulo = signal<TituloCarteira | null>(null);
  detalheExecucao = signal<Execucao | null>(null);

  constructor(public data: MockDataService, public auth: AuthService) {}

  resumo = computed(() =>
    computeClientesResumo(this.data.carteira(), this.data.execucoes()).find(c => c.cliente === this.nome) ?? null
  );

  todosDebitos = computed(() => this.data.carteira().filter(t => t.cliente === this.nome));

  debitos = computed(() => {
    const status = this.statusDebito();
    return this.todosDebitos()
      .filter(t => status === 'todos' || t.status === status)
      .slice()
      .sort((a, b) => parseData(b.dataVencimento).getTime() - parseData(a.dataVencimento).getTime());
  });

  todosAcionamentos = computed(() => this.data.execucoes().filter(e => e.cliente === this.nome));

  acionamentos = computed(() => {
    const status = this.statusAcionamento();
    return this.todosAcionamentos()
      .filter(e => status === 'todos' || e.status === status)
      .slice()
      .sort((a, b) => this.tsExecucao(b) - this.tsExecucao(a));
  });

  private tsExecucao(e: Execucao) {
    return parseData(e.dataHora.split(' ')[0]).getTime();
  }

  statusClassTitulo(s: StatusTitulo) {
    return s === 'Pago' ? 'badge-green' : s === 'Renegociado' ? 'badge-blue' : 'badge-amber';
  }

  statusClassExecucao(s: StatusExecucao) {
    return s === 'Sucesso' ? 'badge-green' : s === 'Falha' ? 'badge-red' : s === 'Tentativa' ? 'badge-amber' : 'badge-gray';
  }

  agingLabel(t: TituloCarteira) {
    const b = agingBucketDe(t);
    return b ? this.agingLabels[b] : '—';
  }

  isTabulado(e: Execucao) {
    return !!e.observacoes;
  }

  money(v: number) {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
