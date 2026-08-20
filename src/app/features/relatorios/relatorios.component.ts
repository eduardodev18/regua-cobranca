import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MockDataService } from '../../core/services/mock-data.service';

/**
 * ⚠️ MOCK — depende de MockDataService.execucoes() (Histórico) e .reguas() (dados de
 * SEED, não a régua real cadastrada em /reguas). Ver PENDENCIAS_BACKEND.md.
 */
@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './relatorios.component.html',
  styleUrl: './relatorios.component.css'
})
export class RelatoriosComponent {
  constructor(public data: MockDataService) {}

  relatorios = [
    { titulo: 'Efetividade por Régua', descricao: 'Taxa de sucesso, tentativas e falhas agrupadas por régua de cobrança.', icone: 'chart' },
    { titulo: 'Execuções por Canal', descricao: 'Volume de disparos e desempenho por canal (E-mail, WhatsApp, SMS, Telefone).', icone: 'channel' },
    { titulo: 'Inadimplência por Faixa', descricao: 'Distribuição de clientes em cobrança por faixa de valor em aberto.', icone: 'money' },
    { titulo: 'Produtividade de Templates', descricao: 'Templates mais utilizados e sua taxa de conversão em pagamento.', icone: 'template' },
  ];

  porRegua = computed(() => {
    const exec = this.data.execucoes();
    return this.data.reguas().map(r => {
      const items = exec.filter(e => e.regua === r.codigo);
      const sucesso = items.filter(e => e.status === 'Sucesso').length;
      const falha = items.filter(e => e.status === 'Falha').length;
      const tentativa = items.filter(e => e.status === 'Tentativa').length;
      const total = items.length || 1;
      return {
        codigo: r.codigo,
        descricao: r.descricao,
        total: items.length,
        sucesso, falha, tentativa,
        taxa: Math.round((sucesso / total) * 100)
      };
    }).filter(r => r.total > 0);
  });

  gerar(titulo: string) {
    alert('Relatório "' + titulo + '" gerado (simulação para apresentação).');
  }
}
