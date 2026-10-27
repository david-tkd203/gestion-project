import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { isAuthed, logout, getMe, getProyectos, login } from '../api';

describe('API & Authentication Module', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    // Mock window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: 'http://localhost/' },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('isAuthed()', () => {
    it('returns false when no access token exists', () => {
      expect(isAuthed()).toBe(false);
    });

    it('returns true when access token is stored in localStorage', () => {
      localStorage.setItem('access_token', 'jwt-test-token-123');
      expect(isAuthed()).toBe(true);
    });
  });

  describe('logout()', () => {
    it('removes access_token from localStorage and redirects to /login', () => {
      localStorage.setItem('access_token', 'token-to-delete');
      logout();

      expect(localStorage.getItem('access_token')).toBeNull();
      expect(window.location.href).toBe('/login');
    });
  });

  describe('request headers & token transmission', () => {
    it('includes Authorization Bearer header when token exists', async () => {
      localStorage.setItem('access_token', 'test-auth-token');

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: '1', username: 'admin', role: 'director', is_admin: true }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const me = await getMe();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/me/');
      expect(opts.headers['Authorization']).toBe('Bearer test-auth-token');
      expect(opts.headers['Content-Type']).toBe('application/json');
      expect(me.username).toBe('admin');
    });

    it('omits Authorization header when no token is present', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ results: [], count: 0 }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await getProyectos();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.headers['Authorization']).toBeUndefined();
    });

    it('handles 401 response by logging out and throwing session expired error', async () => {
      localStorage.setItem('access_token', 'expired-token');

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(getMe()).rejects.toThrow('Sesión expirada');
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(window.location.href).toBe('/login');
    });

    it('posts credentials correctly in login()', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ access: 'new-acc-tok', refresh: 'new-ref-tok' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const tokens = await login('admin', 'secret123');

      expect(mockFetch).toHaveBeenCalledWith('/api/token/', {
        method: 'POST',
        body: JSON.stringify({ username: 'admin', password: 'secret123' }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(tokens.access).toBe('new-acc-tok');
    });
  });
});
