import { test, expect } from '@playwright/test';
import { mockAuthenticatedUser } from '../utils/e2eUtils';

test.describe('2FA Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated user
    await mockAuthenticatedUser(page, {
      id: '123',
      email: 'test@example.com',
      has2FAEnabled: false
    });
  });

  test('complete 2FA setup flow', async ({ page }) => {
    // Navigate to 2FA settings
    await page.goto('/settings/2fa');
    await expect(page.getByText('Two-Factor Authentication Settings')).toBeVisible();

    // Click enable 2FA button
    await page.click('text=Enable 2FA');

    // Fill setup form
    await page.fill('[placeholder="Phone Number"]', '+1234567890');
    await page.fill('[placeholder="Backup Email"]', 'backup@example.com');
    await page.click('text=Set up 2FA');

    // Verify QR code and recovery codes are displayed
    await expect(page.getByAltText('2FA QR Code')).toBeVisible();
    const recoveryCode = await page.textContent('.font-mono');
    expect(recoveryCode).toMatch(/^[A-Z0-9]{16}$/);

    // Enter verification code
    await page.fill('[placeholder="Enter 6-digit code"]', '123456');
    await page.click('text=Verify');

    // Verify success state
    await expect(page.getByText('2FA Setup Complete!')).toBeVisible();
    await expect(page.getByText('Two-factor authentication is currently enabled')).toBeVisible();
  });

  test('2FA verification on login', async ({ page }) => {
    // Mock user with 2FA enabled
    await mockAuthenticatedUser(page, {
      id: '123',
      email: 'test@example.com',
      has2FAEnabled: true
    });

    // Attempt login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('text=Log in');

    // Verify 2FA verification page is shown
    await expect(page.getByText('Two-Factor Authentication')).toBeVisible();
    await expect(page.getByText('Enter the 6-digit code')).toBeVisible();

    // Enter verification code
    await page.fill('[placeholder="Enter 6-digit code"]', '123456');
    await page.click('text=Verify');

    // Verify successful login
    await expect(page.getByText('Dashboard')).toBeVisible();
  });

  test('disable 2FA flow', async ({ page }) => {
    // Mock user with 2FA enabled
    await mockAuthenticatedUser(page, {
      id: '123',
      email: 'test@example.com',
      has2FAEnabled: true
    });

    // Navigate to 2FA settings
    await page.goto('/settings/2fa');
    await expect(page.getByText('Two-Factor Authentication Settings')).toBeVisible();

    // Click disable button
    await page.click('text=Disable 2FA');

    // Fill disable form
    await page.fill('[name="password"]', 'correctpassword');
    await page.check('text=I understand that disabling 2FA will make my account less secure');
    await page.click('text=Disable 2FA');

    // Verify success state
    await expect(page.getByText('2FA successfully disabled')).toBeVisible();
    await expect(page.getByText('Enable 2FA')).toBeVisible();
  });

  test('recovery code flow', async ({ page }) => {
    // Navigate to 2FA verification
    await page.goto('/2fa/verify');

    // Switch to recovery code
    await page.click('text=Use recovery code');

    // Enter recovery code
    await page.fill('[placeholder="Enter 16-character recovery code"]', 'ABCD1234EFGH5678');
    await page.click('text=Use Recovery Code');

    // Verify success and new recovery code provided
    await expect(page.getByText(/new recovery code/i)).toBeVisible();
    const newCode = await page.textContent('.font-mono');
    expect(newCode).toMatch(/^[A-Z0-9]{16}$/);
  });

  test('handles validation errors appropriately', async ({ page }) => {
    await page.goto('/settings/2fa/setup');

    // Submit empty form
    await page.click('text=Set up 2FA');

    // Verify validation errors
    await expect(page.getByText('Phone number is required')).toBeVisible();
    await expect(page.getByText('Backup email is required')).toBeVisible();

    // Enter invalid phone number
    await page.fill('[placeholder="Phone Number"]', '123');
    await page.click('text=Set up 2FA');
    await expect(page.getByText('Invalid phone number format')).toBeVisible();

    // Enter invalid email
    await page.fill('[placeholder="Backup Email"]', 'invalid-email');
    await page.click('text=Set up 2FA');
    await expect(page.getByText('Must be a valid email')).toBeVisible();
  });

  test('handles server errors gracefully', async ({ page }) => {
    // Mock server error
    await page.route('**/api/v1/2fa/setup', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ message: 'Internal server error' })
      });
    });

    await page.goto('/settings/2fa/setup');

    // Fill form with valid data
    await page.fill('[placeholder="Phone Number"]', '+1234567890');
    await page.fill('[placeholder="Backup Email"]', 'backup@example.com');
    await page.click('text=Set up 2FA');

    // Verify error message
    await expect(page.getByText('Internal server error')).toBeVisible();
  });
});
