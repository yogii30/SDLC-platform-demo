// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import indexHtml from '../index.html?raw';
import { LoginPage } from '../src/LoginPage.js';

// Independent QA tests for SDLC-49. They complement tests/LoginPage.test.tsx and
// target cases the implementation's own tests do not pin down.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function form(): HTMLFormElement {
  return screen.getByRole('button', { name: 'Login' }).closest('form')!;
}

describe('AC1: the login page is what the application opens on', () => {
  it('index.html has a #root mount point and loads src/main.tsx', () => {
    const doc = new DOMParser().parseFromString(indexHtml, 'text/html');
    expect(doc.getElementById('root')).not.toBeNull();
    const script = doc.querySelector('script[type="module"]');
    expect(script?.getAttribute('src')).toBe('/src/main.tsx');
  });

  it('renders a top-level heading identifying the page', () => {
    render(<LoginPage />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sign in');
  });
});

describe('AC2: Email input field', () => {
  it('starts empty and accepts typed text', () => {
    render(<LoginPage />);
    const email = screen.getByRole('textbox', { name: 'Email' }) as HTMLInputElement;
    expect(email.value).toBe('');
    fireEvent.change(email, { target: { value: 'user@example.com' } });
    expect(email.value).toBe('user@example.com');
  });

  it('offers email autocomplete', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText('Email').getAttribute('autocomplete')).toBe('email');
  });
});

describe('AC3 and AC4: Password input field masks what is typed', () => {
  it('is not exposed as a plain textbox', () => {
    render(<LoginPage />);
    expect(screen.queryByRole('textbox', { name: 'Password' })).toBeNull();
  });

  it('never renders the typed password as page text', () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'hunter2-secret' } });
    expect(document.body.textContent).not.toContain('hunter2-secret');
  });

  it('uses current-password autocomplete', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText('Password').getAttribute('autocomplete')).toBe('current-password');
  });
});

describe('AC5: Login button below the input fields', () => {
  it('the form holds exactly email, password, then the Login button', () => {
    render(<LoginPage />);
    const controls = Array.from(form().elements) as HTMLElement[];
    expect(controls.map((el) => el.getAttribute('name') ?? el.textContent)).toEqual([
      'email',
      'password',
      'Login',
    ]);
  });

  it('has one enabled submit button', () => {
    render(<LoginPage />);
    const buttons = within(form()).getAllByRole('button');
    expect(buttons).toHaveLength(1);
    const button = buttons[0] as HTMLButtonElement;
    expect(button.type).toBe('submit');
    expect(button.disabled).toBe(false);
  });
});

describe('AC7 and AC8: responsive, consistent layout (structural checks)', () => {
  // Vitest stubs CSS, so the stylesheet's breakpoints and spacing are checked in review.
  it('index.html sets a device-width viewport', () => {
    expect(indexHtml).toMatch(/<meta name="viewport" content="width=device-width, initial-scale=1\.0"/u);
  });
});

describe('AC9: no backend API or authentication', () => {
  it('pressing Enter in the password field makes no network request', () => {
    const fetchSpy = vi.fn();
    const xhrOpen = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(xhrOpen);
    render(<LoginPage />);

    const password = screen.getByLabelText('Password');
    fireEvent.change(password, { target: { value: 'secret' } });
    fireEvent.keyDown(password, { key: 'Enter', code: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrOpen).not.toHaveBeenCalled();
  });

  it('keeps the entered values after Login is clicked', () => {
    render(<LoginPage />);
    const email = screen.getByLabelText('Email') as HTMLInputElement;
    const password = screen.getByLabelText('Password') as HTMLInputElement;
    fireEvent.change(email, { target: { value: 'a@b.co' } });
    fireEvent.change(password, { target: { value: 'secret' } });

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(email.value).toBe('a@b.co');
    expect(password.value).toBe('secret');
  });
});

describe('AC10: no routing', () => {
  it('the page contains no links to other routes', () => {
    render(<LoginPage />);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
});
