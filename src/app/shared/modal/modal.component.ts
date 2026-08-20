import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css'
})
export class ModalComponent {
  @Input() title = '';
  @Input() width = '620px';
  @Output() close = new EventEmitter<void>();

  onBackdrop() {
    this.close.emit();
  }
}
