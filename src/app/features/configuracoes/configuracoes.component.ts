import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './configuracoes.component.html',
  styleUrl: './configuracoes.component.css'
})
export class ConfiguracoesComponent {
  tab = signal<'geral' | 'integracoes' | 'usuarios'>('geral');

  geral = {
    nomeEmpresa: 'NEXA Soluções Financeiras',
    horaIni: '08:00',
    horaFim: '20:00',
    fusoHorario: 'America/Sao_Paulo',
    reenvioAutomatico: true,
    notificarFalhas: true,
    pausarFeriados: true,
  };

  integracoes = [
    { nome: 'API de E-mail (SMTP)', status: 'Conectado', detalhe: 'smtp.nexa.com.br · porta 587' },
    { nome: 'WhatsApp Business API', status: 'Conectado', detalhe: 'Número: +55 11 91234-5678' },
    { nome: 'Gateway de SMS', status: 'Desconectado', detalhe: 'Nenhum provedor configurado' },
    { nome: 'ERP / Protheus (ADVPL)', status: 'Conectado', detalhe: 'Ambiente: PRODUCAO_01' },
  ];

  usuarios = [
    { nome: 'Administrador', email: 'admin@nexa.com.br', perfil: 'Administrador', ativo: true },
    { nome: 'Fernanda Costa', email: 'fernanda.costa@nexa.com.br', perfil: 'Analista de Cobrança', ativo: true },
    { nome: 'Roberto Nunes', email: 'roberto.nunes@nexa.com.br', perfil: 'Supervisor', ativo: true },
    { nome: 'Camila Rocha', email: 'camila.rocha@nexa.com.br', perfil: 'Analista de Cobrança', ativo: false },
  ];

  salvar() {
    alert('Configurações salvas com sucesso (simulação para apresentação).');
  }
}
