import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewsletterSubscribe from '../index';

// Mock the hooks
vi.mock('@site/src/hooks', () => ({
  useLocale: vi.fn(() => 'en'),
}));

// Mock the config
vi.mock('@site/src/config/environment', () => ({
  config: {
    getApiEndpoint: () => '',
    routes: {
      newsletterSubscribe: '/api/newsletter/subscribe',
    },
  },
}));

describe('NewsletterSubscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('renders the subscription form', () => {
    render(<NewsletterSubscribe />);
    expect(screen.getByText('📬 Stay Updated')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your email address')).toBeInTheDocument();
    expect(screen.getByText('Subscribe')).toBeInTheDocument();
  });

  it('renders frequency selector with weekly and monthly options', () => {
    render(<NewsletterSubscribe />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('Weekly')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
  });

  it('shows error for invalid email', async () => {
    render(<NewsletterSubscribe />);
    const form = document.querySelector('form');
    const emailInput = screen.getByPlaceholderText('Your email address');

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.submit(form);

    expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
  });

  it('shows success message after successful subscription', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Success' }),
    });

    render(<NewsletterSubscribe />);
    const emailInput = screen.getByPlaceholderText('Your email address');
    const submitButton = screen.getByText('Subscribe');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Check your email!')).toBeInTheDocument();
    });
  });

  it('shows error when email is already subscribed', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 409,
    });

    render(<NewsletterSubscribe />);
    const emailInput = screen.getByPlaceholderText('Your email address');
    const submitButton = screen.getByText('Subscribe');

    fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('This email is already subscribed.')).toBeInTheDocument();
    });
  });

  it('includes honeypot field that is hidden', () => {
    render(<NewsletterSubscribe />);
    const honeypot = document.querySelector('input[name="website"]');
    expect(honeypot).toBeInTheDocument();
    expect(honeypot).toHaveAttribute('aria-hidden', 'true');
    expect(honeypot).toHaveAttribute('tabindex', '-1');
  });

  it('includes privacy policy link', () => {
    render(<NewsletterSubscribe />);
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });

  it('disables submit button while loading', async () => {
    global.fetch = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 500))
    );

    render(<NewsletterSubscribe />);
    const emailInput = screen.getByPlaceholderText('Your email address');
    const submitButton = screen.getByText('Subscribe');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    expect(screen.getByText('Subscribing...')).toBeDisabled();
  });
});
