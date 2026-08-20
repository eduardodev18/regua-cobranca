import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { formatCnpj } from '../../../core/services/cnpj';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  cnpj = signal('');
  senha = signal('');
  showPassword = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  sessionExpired = signal(false);
  touched = signal(false);

  private redirect: string | null = null;

  constructor(private auth: AuthService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.sessionExpired.set(params.get('session') === 'expired');
    this.redirect = params.get('redirect');
  }

  onCnpjChange(value: string): void {
    this.cnpj.set(formatCnpj(value));
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  get cnpjDigits(): string {
    return this.cnpj().replace(/\D/g, '');
  }

  get cnpjInvalido(): boolean {
    return this.cnpjDigits.length !== 14;
  }

  get senhaInvalida(): boolean {
    return this.senha().length < 6;
  }

  onSubmit(): void {
    this.touched.set(true);
    this.error.set(null);

    if (this.cnpjInvalido || this.senhaInvalida) return;

    this.loading.set(true);
    this.auth.login({ username: this.cnpjDigits, password: this.senha() }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl(this.redirect || '/');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(this.extractErrorMessage(err));
      }
    });
  }

  private extractErrorMessage(err: any): string {
    return err?.error?.message || err?.message || 'Erro ao efetuar login. Verifique suas credenciais.';
  }
}
