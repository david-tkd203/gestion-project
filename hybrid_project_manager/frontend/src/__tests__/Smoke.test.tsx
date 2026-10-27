import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import {
  LayoutDashboard,
  KanbanIcon,
  CheckCircle,
  AlertTriangle,
  LogIn,
} from '../icons';
import Login from '../pages/Login';

// Mock ThreeBackground to avoid WebGL context requirements in jsdom
vi.mock('../ThreeBackground', () => ({
  default: () => <div data-testid="three-background-mock" />,
}));

describe('Smoke & Basic Component Tests', () => {
  describe('Icons', () => {
    it('renders SVG icons cleanly without throwing', () => {
      const { container } = render(
        <div>
          <LayoutDashboard />
          <KanbanIcon />
          <CheckCircle />
          <AlertTriangle />
          <LogIn />
        </div>
      );

      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBe(5);
      svgs.forEach((svg) => {
        expect(svg).toBeInTheDocument();
        expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
      });
    });
  });

  describe('Login Smoke Test', () => {
    it('renders login form elements and header', () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('VINCULOmaster');
      expect(screen.getByText('Usuario')).toBeInTheDocument();
      expect(screen.getByText('Contrasena')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Iniciar sesion/i })).toBeInTheDocument();
      expect(screen.getByTestId('three-background-mock')).toBeInTheDocument();
    });
  });
});
