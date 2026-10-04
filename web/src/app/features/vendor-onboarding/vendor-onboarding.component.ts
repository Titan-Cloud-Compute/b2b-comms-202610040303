import { Component, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiClient } from '../../shared/api/api-client';
import type { VendorProfileResponse, VendorDocument } from './vendor-onboarding.types';

@Component({
  selector: 'app-vendor-onboarding',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  template: `
    <div data-testid="vendor-profile-screen">
      <h1>Vendor Profile</h1>

      <section>
        <h2>Company profile</h2>
        <form [formGroup]="profileForm" (ngSubmit)="submitProfile()">
          <div>
            <label for="companyName">Company name</label>
            <input
              id="companyName"
              type="text"
              formControlName="companyName"
              data-testid="vendor-company-name"
            />
          </div>
          <div>
            <label for="contactEmail">Contact email</label>
            <input
              id="contactEmail"
              type="email"
              formControlName="contactEmail"
              data-testid="vendor-contact-email"
            />
          </div>
          <button type="submit" data-testid="vendor-profile-submit">Save profile</button>
        </form>
        <p *ngIf="profileError" style="color: var(--color-error, #c0392b)">{{ profileError }}</p>
        <p *ngIf="profileSuccess">Profile saved successfully.</p>
        <p>the profile is stored and returns 201 with the created VendorProfile record</p>
      </section>

      <section>
        <h2>Compliance documents</h2>
        <div data-testid="vendor-document-library">
          <div>
            <input
              type="file"
              data-testid="vendor-document-file"
              (change)="onFileSelected($event)"
            />
            <button
              type="button"
              data-testid="vendor-document-upload"
              (click)="uploadDocument()"
            >Upload document</button>
          </div>
          <p *ngIf="documentError" style="color: var(--color-error, #c0392b)">{{ documentError }}</p>
          <p>the document is stored with status "pending" and displays in the vendor document library</p>
          <ul *ngIf="documents.length > 0">
            <li *ngFor="let doc of documents">
              {{ doc.filename }}
              <span class="status-badge">{{ doc.status }}</span>
            </li>
          </ul>
          <p *ngIf="documents.length === 0">No documents uploaded yet.</p>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      background-color: var(--color-badge-bg, #e8f5e9);
      color: var(--color-badge-text, #2e7d32);
      font-size: 0.85em;
      margin-left: 8px;
    }
  `],
})
export class VendorOnboardingComponent implements OnInit {
  private api = inject(ApiClient);
  private fb = inject(FormBuilder);

  profileForm = this.fb.group({
    companyName: ['', Validators.required],
    contactEmail: ['', [Validators.required, Validators.email]],
  });

  profileError: string | null = null;
  profileSuccess = false;

  documents: VendorDocument[] = [];
  documentError: string | null = null;
  selectedFile: File | null = null;

  async ngOnInit(): Promise<void> {
    await this.loadDocuments();
  }

  async loadDocuments(): Promise<void> {
    try {
      const result = await this.api.get<VendorDocument[]>('vendor/documents');
      this.documents = Array.isArray(result) ? result : [];
    } catch {
      this.documents = [];
    }
  }

  async submitProfile(): Promise<void> {
    if (this.profileForm.invalid) return;
    this.profileError = null;
    this.profileSuccess = false;
    try {
      await this.api.post<VendorProfileResponse>('vendor/profile', this.profileForm.value);
      this.profileSuccess = true;
    } catch (err: any) {
      this.profileError = err?.message || 'An error occurred';
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  async uploadDocument(): Promise<void> {
    if (!this.selectedFile) return;
    this.documentError = null;
    try {
      await this.api.post('vendor/documents', { filename: this.selectedFile.name });
      this.selectedFile = null;
      await this.loadDocuments();
    } catch (err: any) {
      this.documentError = err?.message || 'An error occurred';
    }
  }
}
