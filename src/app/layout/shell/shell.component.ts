import { Component, computed, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { formatCnpj } from '../../core/services/cnpj';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css'
})
export class ShellComponent {
  reguasOpen = signal(true);
  userMenuOpen = signal(false);

  constructor(public auth: AuthService, private router: Router) {}

  /** CNPJ do usuário logado (vem do login real), formatado pra exibição. */
  cnpjExibicao = computed(() => {
    const cnpj = this.auth.user()?.cnpj;
    return cnpj ? formatCnpj(cnpj) : '';
  });

  toggleReguas() {
    this.reguasOpen.update(v => !v);
  }

  toggleUserMenu() {
    this.userMenuOpen.update(v => !v);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
