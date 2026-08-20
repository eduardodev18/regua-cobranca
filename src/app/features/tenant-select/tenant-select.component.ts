import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/auth.model';
import { Tenant } from '../../core/models/tenant.model';

/**
 * Portal multi-tenant sem unidade identificada na URL (ex: acesso a "/" ou a uma rota
 * antiga sem prefixo). Lista as unidades disponíveis (GET {apiBase}/tenants — endpoint
 * não escopado por tenant) e, ao escolher uma, faz um reload completo pra /{code}/login
 * — trocar de unidade muda o base href do app, que só é calculado uma vez no bootstrap.
 */
@Component({
  selector: 'app-tenant-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tenant-select.component.html',
  styleUrl: './tenant-select.component.css'
})
export class TenantSelectComponent implements OnInit {
  private http = inject(HttpClient);

  tenants = signal<Tenant[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.http.get<ApiResponse<Tenant[]>>(`${environment.apiBase}/tenants`).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (!res.success) {
          this.error.set(res.message || 'Não foi possível carregar as unidades.');
          return;
        }
        this.tenants.set(res.data);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Não foi possível carregar as unidades. Tente novamente.');
      }
    });
  }

  selecionar(tenant: Tenant): void {
    window.location.href = `/${tenant.code}/login`;
  }
}
