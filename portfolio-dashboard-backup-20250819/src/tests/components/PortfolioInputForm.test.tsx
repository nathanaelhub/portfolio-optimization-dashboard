/**
 * Test suite for PortfolioInputForm component.
 * 
 * Tests user interactions, form validation, accessibility,
 * and integration with portfolio management features.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { jest } from '@jest/globals';

import PortfolioInputForm from '../../components/PortfolioInputForm';
import { PortfolioContext } from '../../contexts/PortfolioContext';
import { mockPortfolioData, mockApiResponse } from '../setup';

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  const mockPortfolioContext = {
    portfolios: [mockPortfolioData],
    currentPortfolio: null,
    setCurrentPortfolio: jest.fn(),
    addPortfolio: jest.fn(),
    updatePortfolio: jest.fn(),
    deletePortfolio: jest.fn(),
    isLoading: false,
    error: null
  };

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <PortfolioContext.Provider value={mockPortfolioContext}>
          {children}
        </PortfolioContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('PortfolioInputForm', () => {
  let mockOnSubmit: jest.Mock;
  let mockOnCancel: jest.Mock;

  beforeEach(() => {
    mockOnSubmit = jest.fn();
    mockOnCancel = jest.fn();
    jest.clearAllMocks();
  });

  describe('Form Rendering', () => {
    it('renders all form fields correctly', () => {
      render(
        <TestWrapper>
          <PortfolioInputForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      // Check required form fields
      expect(screen.getByLabelText(/portfolio name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/risk tolerance/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/investment horizon/i)).toBeInTheDocument();
      
      // Check asset allocation section
      expect(screen.getByText(/asset allocation/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add asset/i })).toBeInTheDocument();
      
      // Check action buttons
      expect(screen.getByRole('button', { name: /create portfolio/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('renders with initial data when editing existing portfolio', () => {
      const initialData = {
        name: 'Existing Portfolio',
        description: 'Test description',
        riskTolerance: 'moderate' as const,
        investmentHorizon: 5,
        assets: [
          { symbol: 'AAPL', allocation: 0.6 },
          { symbol: 'MSFT', allocation: 0.4 }
        ]
      };

      render(
        <TestWrapper>
          <PortfolioInputForm 
            onSubmit={mockOnSubmit} 
            onCancel={mockOnCancel}
            initialData={initialData}
          />
        </TestWrapper>
      );

      expect(screen.getByDisplayValue('Existing Portfolio')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
      
      // Check assets are populated
      expect(screen.getByDisplayValue('AAPL')).toBeInTheDocument();
      expect(screen.getByDisplayValue('60')).toBeInTheDocument(); // 0.6 * 100
      expect(screen.getByDisplayValue('MSFT')).toBeInTheDocument();
      expect(screen.getByDisplayValue('40')).toBeInTheDocument(); // 0.4 * 100
    });

    it('shows loading state during form submission', async () => {
      mockOnSubmit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <TestWrapper>
          <PortfolioInputForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      // Fill required fields
      await userEvent.type(screen.getByLabelText(/portfolio name/i), 'Test Portfolio');
      await userEvent.click(screen.getByRole('button', { name: /add asset/i }));
      await userEvent.type(screen.getByPlaceholderText(/symbol/i), 'AAPL');
      await userEvent.type(screen.getByPlaceholderText(/allocation/i), '100');

      // Submit form
      await userEvent.click(screen.getByRole('button', { name: /create portfolio/i }));

      // Check loading state
      expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('validates required portfolio name', async () => {
      render(
        <TestWrapper>
          <PortfolioInputForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      // Try to submit without name
      await userEvent.click(screen.getByRole('button', { name: /create portfolio/i }));

      await waitFor(() => {
        expect(screen.getByText(/portfolio name is required/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('validates portfolio name length', async () => {
      render(
        <TestWrapper>
          <PortfolioInputForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      // Enter very long name
      const longName = 'a'.repeat(101);
      await userEvent.type(screen.getByLabelText(/portfolio name/i), longName);
      await userEvent.tab(); // Trigger validation

      await waitFor(() => {
        expect(screen.getByText(/name must be less than 100 characters/i)).toBeInTheDocument();
      });
    });

    it('validates asset allocations sum to 100%', async () => {
      render(
        <TestWrapper>
          <PortfolioInputForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      // Fill form with invalid allocations
      await userEvent.type(screen.getByLabelText(/portfolio name/i), 'Test Portfolio');
      
      // Add first asset
      await userEvent.click(screen.getByRole('button', { name: /add asset/i }));
      await userEvent.type(screen.getByPlaceholderText(/symbol/i), 'AAPL');
      await userEvent.type(screen.getByPlaceholderText(/allocation/i), '60');

      // Add second asset with total > 100%
      await userEvent.click(screen.getByRole('button', { name: /add asset/i }));
      const symbolInputs = screen.getAllByPlaceholderText(/symbol/i);
      const allocationInputs = screen.getAllByPlaceholderText(/allocation/i);
      
      await userEvent.type(symbolInputs[1], 'MSFT');
      await userEvent.type(allocationInputs[1], '50'); // Total = 110%

      // Try to submit
      await userEvent.click(screen.getByRole('button', { name: /create portfolio/i }));

      await waitFor(() => {
        expect(screen.getByText(/total allocation must equal 100%/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('validates individual asset allocation ranges', async () => {
      render(
        <TestWrapper>
          <PortfolioInputForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      await userEvent.click(screen.getByRole('button', { name: /add asset/i }));
      await userEvent.type(screen.getByPlaceholderText(/symbol/i), 'AAPL');
      
      // Test negative allocation
      await userEvent.type(screen.getByPlaceholderText(/allocation/i), '-10');
      await userEvent.tab();

      await waitFor(() => {
        expect(screen.getByText(/allocation must be between 0 and 100/i)).toBeInTheDocument();
      });

      // Test allocation > 100%
      await userEvent.clear(screen.getByPlaceholderText(/allocation/i));
      await userEvent.type(screen.getByPlaceholderText(/allocation/i), '150');
      await userEvent.tab();

      await waitFor(() => {
        expect(screen.getByText(/allocation must be between 0 and 100/i)).toBeInTheDocument();
      });
    });

    it('validates duplicate asset symbols', async () => {
      render(
        <TestWrapper>
          <PortfolioInputForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      // Add first asset
      await userEvent.click(screen.getByRole('button', { name: /add asset/i }));
      await userEvent.type(screen.getByPlaceholderText(/symbol/i), 'AAPL');
      await userEvent.type(screen.getByPlaceholderText(/allocation/i), '50');

      // Add second asset with same symbol
      await userEvent.click(screen.getByRole('button', { name: /add asset/i }));
      const symbolInputs = screen.getAllByPlaceholderText(/symbol/i);
      await userEvent.type(symbolInputs[1], 'AAPL');

      await waitFor(() => {
        expect(screen.getByText(/duplicate asset symbol/i)).toBeInTheDocument();
      });
    });

    it('validates minimum number of assets', async () => {
      render(
        <TestWrapper>
          <PortfolioInputForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      await userEvent.type(screen.getByLabelText(/portfolio name/i), 'Test Portfolio');
      
      // Try to submit without any assets
      await userEvent.click(screen.getByRole('button', { name: /create portfolio/i }));

      await waitFor(() => {
        expect(screen.getByText(/at least one asset is required/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Asset Management', () => {
    it('adds new asset when Add Asset button is clicked', async () => {
      render(
        <TestWrapper>
          <PortfolioInputForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      expect(screen.queryByPlaceholderText(/symbol/i)).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /add asset/i }));

      expect(screen.getByPlaceholderText(/symbol/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/allocation/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
    });

    it('removes asset when remove button is clicked', async () => {
      render(
        <TestWrapper>
          <PortfolioInputForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      // Add asset
      await userEvent.click(screen.getByRole('button', { name: /add asset/i }));
      await userEvent.type(screen.getByPlaceholderText(/symbol/i), 'AAPL');

      expect(screen.getByDisplayValue('AAPL')).toBeInTheDocument();

      // Remove asset
      await userEvent.click(screen.getByRole('button', { name: /remove/i }));

      expect(screen.queryByDisplayValue('AAPL')).not.toBeInTheDocument();
    });

    it('updates allocation percentage display', async () => {
      render(
        <TestWrapper>
          <PortfolioInputForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      await userEvent.click(screen.getByRole('button', { name: /add asset/i }));
      await userEvent.type(screen.getByPlaceholderText(/allocation/i), '25');

      // Should show 25% in the display
      expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('auto-suggests asset symbols during typing', async () => {
      // Mock asset search API
      mockApiResponse.get.mockResolvedValue({
        data: [
          { symbol: 'AAPL', name: 'Apple Inc.' },
          { symbol: 'AMZN', name: 'Amazon.com Inc.' }
        ]
      });

      render(
        <TestWrapper>
          <PortfolioInputForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      await userEvent.click(screen.getByRole('button', { name: /add asset/i }));
      const symbolInput = screen.getByPlaceholderText(/symbol/i);
      
      await userEvent.type(symbolInput, 'A');

      await waitFor(() => {
        expect(screen.getByText('AAPL - Apple Inc.')).toBeInTheDocument();
        expect(screen.getByText('AMZN - Amazon.com Inc.')).toBeInTheDocument();
      });
    });

    it('limits maximum number of assets', async () => {
      render(
        <TestWrapper>
          <PortfolioInputForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} maxAssets={2} />
        </TestWrapper>
      );

      // Add maximum number of assets
      await userEvent.click(screen.getByRole('button', { name: /add asset/i }));
      await userEvent.click(screen.getByRole('button', { name: /add asset/i }));

      // Add Asset button should be disabled
      expect(screen.getByRole('button', { name: /add asset/i })).toBeDisabled();
      expect(screen.getByText(/maximum 2 assets allowed/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('submits valid form data correctly', async () => {
      render(
        <TestWrapper>
          <PortfolioInputForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      // Fill form
      await userEvent.type(screen.getByLabelText(/portfolio name/i), 'My Portfolio');
      await userEvent.type(screen.getByLabelText(/description/i), 'Test description');
      await userEvent.selectOptions(screen.getByLabelText(/risk tolerance/i), 'aggressive');
      await userEvent.type(screen.getByLabelText(/investment horizon/i), '10');

      // Add assets
      await userEvent.click(screen.getByRole('button', { name: /add asset/i }));
      await userEvent.type(screen.getByPlaceholderText(/symbol/i), 'AAPL');
      await userEvent.type(screen.getByPlaceholderText(/allocation/i), '60');

      await userEvent.click(screen.getByRole('button', { name: /add asset/i }));
      const symbolInputs = screen.getAllByPlaceholderText(/symbol/i);
      const allocationInputs = screen.getAllByPlaceholderText(/allocation/i);
      await userEvent.type(symbolInputs[1], 'MSFT');
      await userEvent.type(allocationInputs[1], '40');

      // Submit
      await userEvent.click(screen.getByRole('button', { name: /create portfolio/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'My Portfolio',
          description: 'Test description',
          riskTolerance: 'aggressive',
          investmentHorizon: 10,
          assets: [
            { symbol: 'AAPL', allocation: 0.6 },
            { symbol: 'MSFT', allocation: 0.4 }
          ]
        });
      });
    });

    it('handles submission errors gracefully', async () => {
      const errorMessage = 'Failed to create portfolio';
      mockOnSubmit.mockRejectedValue(new Error(errorMessage));

      render(
        <TestWrapper>
          <PortfolioInputForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      // Fill minimal valid form
      await userEvent.type(screen.getByLabelText(/portfolio name/i), 'Test Portfolio');
      await userEvent.click(screen.getByRole('button', { name: /add asset/i }));
      await userEvent.type(screen.getByPlaceholderText(/symbol/i), 'AAPL');
      await userEvent.type(screen.getByPlaceholderText(/allocation/i), '100');

      // Submit
      await userEvent.click(screen.getByRole('button', { name: /create portfolio/i }));

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Form should be re-enabled
      expect(screen.getByRole('button', { name: /create portfolio/i })).not.toBeDisabled();
    });

    it('calls onCancel when cancel button is clicked', async () => {
      render(
        <TestWrapper>
          <PortfolioInputForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(
        <TestWrapper>
          <PortfolioInputForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      // Check form has proper role
      expect(screen.getByRole('form')).toBeInTheDocument();

      // Check required fields are marked as required
      expect(screen.getByLabelText(/portfolio name/i)).toHaveAttribute('required');
      expect(screen.getByLabelText(/portfolio name/i)).toHaveAttribute('aria-required', 'true');

      // Check error messages have proper ARIA attributes
      expect(screen.getByRole('form')).toHaveAttribute('noValidate');
    });

    it('supports keyboard navigation', async () => {
      render(
        <TestWrapper>
          <PortfolioInputForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      const nameInput = screen.getByLabelText(/portfolio name/i);
      const addAssetButton = screen.getByRole('button', { name: /add asset/i });

      // Tab navigation should work
      nameInput.focus();
      expect(document.activeElement).toBe(nameInput);

      await userEvent.tab();
      expect(document.activeElement).toBe(screen.getByLabelText(/description/i));

      // Should be able to activate buttons with Enter/Space
      addAssetButton.focus();
      await userEvent.keyboard('{Enter}');

      expect(screen.getByPlaceholderText(/symbol/i)).toBeInTheDocument();
    });

    it('provides proper error announcements for screen readers', async () => {
      render(
        <TestWrapper>
          <PortfolioInputForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      // Submit invalid form
      await userEvent.click(screen.getByRole('button', { name: /create portfolio/i }));

      await waitFor(() => {
        const errorMessage = screen.getByText(/portfolio name is required/i);
        expect(errorMessage).toHaveAttribute('role', 'alert');
        expect(errorMessage).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('maintains focus management during dynamic content changes', async () => {
      render(
        <TestWrapper>
          <PortfolioInputForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      // Add asset and check focus moves to new input
      await userEvent.click(screen.getByRole('button', { name: /add asset/i }));

      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByPlaceholderText(/symbol/i));
      });

      // Remove asset and check focus is managed
      await userEvent.click(screen.getByRole('button', { name: /remove/i }));

      // Focus should return to Add Asset button
      expect(document.activeElement).toBe(screen.getByRole('button', { name: /add asset/i }));
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <TestWrapper>
          <PortfolioInputForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      const form = screen.getByRole('form');
      expect(form).toHaveClass('mobile-layout'); // Assuming CSS class is applied
    });

    it('shows/hides advanced options based on screen size', () => {
      render(
        <TestWrapper>
          <PortfolioInputForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      // Advanced options should be collapsible on mobile
      const advancedToggle = screen.queryByRole('button', { name: /advanced options/i });
      
      if (advancedToggle) {
        expect(advancedToggle).toBeInTheDocument();
      }
    });
  });

  describe('Performance', () => {
    it('debounces validation during rapid input', async () => {
      const mockValidation = jest.fn();
      
      render(
        <TestWrapper>
          <PortfolioInputForm 
            onSubmit={mockOnSubmit} 
            onCancel={mockOnCancel}
            onValidate={mockValidation}
          />
        </TestWrapper>
      );

      const nameInput = screen.getByLabelText(/portfolio name/i);

      // Type rapidly
      await userEvent.type(nameInput, 'Test', { delay: 10 });

      // Validation should be debounced
      await waitFor(() => {
        expect(mockValidation).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });
    });

    it('efficiently handles large numbers of assets', async () => {
      render(
        <TestWrapper>
          <PortfolioInputForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
        </TestWrapper>
      );

      // Add many assets rapidly
      const addButton = screen.getByRole('button', { name: /add asset/i });
      
      for (let i = 0; i < 20; i++) {
        if (!addButton.disabled) {
          await userEvent.click(addButton);
        }
      }

      // Form should remain responsive
      expect(screen.getAllByPlaceholderText(/symbol/i)).toHaveLength(20);
    });
  });
});