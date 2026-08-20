import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CollectionActionTypesService } from '../../../core/services/collection-action-types.service';
import { ApiActionType } from '../../../core/models/api-catalog.model';

/**
 * Catálogo de Tipos de Ação — somente leitura (GET /collection-action-types).
 * A API não expõe POST/PUT/DELETE aqui: é um cadastro fixo mantido pelo time de
 * Protheus (ADVPL), por isso não há mais botão de criar/editar/excluir nesta tela
 * (diferente da versão mock anterior).
 */
@Component({
  selector: 'app-tipo-acao-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tipo-acao-list.component.html',
  styleUrl: './tipo-acao-list.component.css'
})
export class TipoAcaoListComponent implements OnInit {
  private service = inject(CollectionActionTypesService);

  tipos = signal<ApiActionType[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.list().subscribe({
      next: (data) => {
        this.loading.set(false);
        this.tipos.set(data);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Não foi possível carregar os tipos de ação.');
      }
    });
  }
}
