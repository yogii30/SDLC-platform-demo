// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LoginPage } from '../src/LoginPage.js';

// Tests for SDLC-49. AC6-AC8 (visual design, responsiveness, spacing) are checked by
// review, not here.

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('AC1: the login page is displayed when the application opens', () => {
  it('main.tsx renders the login page into #root', async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);

    await act(async () => {
      await import('../src/main.js');
    });

    expect(root.querySelector('form')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeDefined();
  });

  it('main.tsx fails loudly when #root is missing', async () => {
    await expect(import('../src/main.js')).rejects.toThrow('Missing #root element');
  });
});

describe('AC2: Email input field', () => {
  it('has a labelled email input', () => {
    render(<LoginPage />);
    const email = screen.getByLabelText('Email') as HTMLInputElement;
    expect(email.tagName).toBe('INPUT');
    expect(email.type).toBe('email');
  });
});

describe('AC3 and AC4: Password input field that masks its characters', () => {
  it('has a labelled password input of type password', () => {
    render(<LoginPage />);
    const password = screen.getByLabelText('Password') as HTMLInputElement;
    expect(password.tagName).toBe('INPUT');
    expect(password.type).toBe('password');
  });

  it('keeps the type password after text is entered', () => {
    render(<LoginPage />);
    const password = screen.getByLabelText('Password') as HTMLInputElement;
    fireEvent.change(password, { target: { value: 'secret' } });
    expect(password.value).toBe('secret');
    expect(password.type).toBe('password');
  });
});

describe('AC5: Login button below the input fields', () => {
  it('shows a Login button', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: 'Login' })).toBeDefined();
  });

  it('places the button after both inputs', () => {
    render(<LoginPage />);
    const email = screen.getByLabelText('Email');
    const password = screen.getByLabelText('Password');
    const button = screen.getByRole('button', { name: 'Login' });
    const following = Node.DOCUMENT_POSITION_FOLLOWING;
    expect(email.compareDocumentPosition(password) & following).toBeTruthy();
    expect(password.compareDocumentPosition(button) & following).toBeTruthy();
  });
});

describe('AC9: no backend or authentication', () => {
  it('makes no network request and prevents the default submit', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    const submitted = fireEvent.submit(screen.getByRole('button', { name: 'Login' }).closest('form')!);

    expect(submitted).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('has no action or method that would post the form', () => {
    render(<LoginPage />);
    const form = screen.getByRole('button', { name: 'Login' }).closest('form')!;
    expect(form.getAttribute('action')).toBeNull();
    expect(form.getAttribute('method')).toBeNull();
  });
});
