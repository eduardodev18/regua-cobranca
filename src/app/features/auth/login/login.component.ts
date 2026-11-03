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
  /** Aceita CNPJ (aplica máscara automaticamente enquanto só houver dígitos) ou um
   *  usuário em texto livre — ver `isCnpjMode`/`onIdentificadorChange`. */
  identificador = signal('');
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

  /**
   * Detecta CNPJ x usuário pelo que já foi digitado: se, tirando os caracteres da
   * máscara (. / -), sobrar só dígitos, tratamos como CNPJ em digitação e aplicamos a
   * máscara progressivamente. Assim que aparecer uma letra (ou qualquer outro caractere),
   * paramos de mascarar e deixamos o valor como usuário em texto livre.
   */
  onIdentificadorChange(value: string): void {
    this.identificador.set(this.isDigitsOnly(value) ? formatCnpj(value) : value);
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  private isDigitsOnly(value: string): boolean {
    const semMascara = value.replace(/[.\-/]/g, '');
    return semMascara !== '' && /^\d+$/.test(semMascara);
  }

  /** true enquanto o campo só tiver dígitos (e máscara de CNPJ) digitados até agora. */
  get isCnpjMode(): boolean {
    return this.isDigitsOnly(this.identificador());
  }

  get cnpjDigits(): string {
    return this.identificador().replace(/\D/g, '');
  }

  /** CNPJ precisa ter os 14 dígitos; usuário em texto livre só precisa não estar vazio. */
  get identificadorInvalido(): boolean {
    const valor = this.identificador().trim();
    if (!valor) return true;
    return this.isCnpjMode && this.cnpjDigits.length !== 14;
  }

  get senhaInvalida(): boolean {
    return this.senha().length < 6;
  }

  onSubmit(): void {
    this.touched.set(true);
    this.error.set(null);

    if (this.identificadorInvalido || this.senhaInvalida) return;

    const username = this.isCnpjMode ? this.cnpjDigits : this.identificador().trim();

    this.loading.set(true);
    this.auth.login({ username, password: this.senha() }).subscribe({
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
