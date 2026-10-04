import { Component, input } from '@angular/core';

/**
 * <app-page> — the shared page wrapper for every routed screen.
 *
 * Renders the token-based page container, header (h1 + optional subtitle +
 * projected [page-actions]) and body. Card / table / form / button / alert
 * primitives for projected content live in src/styles/page.css, so feature
 * components stay free of raw colour, type and spacing literals.
 */
@Component({
  selector: 'app-page',
  standalone: true,
  template: `
    <div class="page">
      <header class="page-header">
        <div class="page-heading">
          <h1>{{ heading() }}</h1>
          @if (subtitle()) {
            <p class="page-subtitle">{{ subtitle() }}</p>
          }
        </div>
        <div class="page-actions">
          <ng-content select="[page-actions]" />
        </div>
      </header>
      <div class="page-body">
        <ng-content />
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-width: 0;
    }

    .page-actions:empty {
      display: none;
    }
  `],
})
export class PageComponent {
  readonly heading = input.required<string>();
  readonly subtitle = input<string>('');
}
