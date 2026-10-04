import { Component } from '@angular/core';

@Component({
  selector: 'app-vendor-profile',
  standalone: true,
  imports: [],
  template: `
    <div data-testid="vendor-profile-screen">
      <h1>Vendor Profile</h1>
      <p>profile form and document upload</p>
    </div>
  `,
})
export class VendorProfileComponent {}
