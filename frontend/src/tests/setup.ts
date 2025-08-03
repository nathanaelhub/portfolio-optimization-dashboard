/**
 * Test setup configuration for React Testing Library and Jest.
 * Configures testing environment, mocks, and utilities.
 */

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { vi } from 'vitest';

// Configure React Testing Library
configure({
  testIdAttribute: 'data-testid',
  getElementError: (message: string | null) => {
    const error = new Error(
      message ||
      'Unable to find element. This could be because the text is broken up by multiple elements.'
    );
    error.name = 'TestingLibraryElementError';
    return error;
  }
});

// Global test environment setup
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock Canvas API for D3 chart testing
HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(() => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Array(4) })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => []),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
}));

// Mock window.getComputedStyle for responsive design tests
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
    width: '1024px',
    height: '768px',
  }),
});

// Mock scrollTo for navigation tests
Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  writable: true
});

// Suppress console.error for expected errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
       args[0].includes('Warning: Each child in a list should have a unique "key" prop'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock
});

// Mock URL.createObjectURL for file upload tests
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'mocked-object-url')
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn()
});

// Export common test utilities
export const mockPortfolioData = {
  id: '1',
  name: 'Test Portfolio',
  description: 'A test portfolio for unit testing',
  assets: [
    { symbol: 'AAPL', name: 'Apple Inc.', allocation: 0.4, value: 40000 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', allocation: 0.3, value: 30000 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', allocation: 0.3, value: 30000 }
  ],
  totalValue: 100000,
  expectedReturn: 0.12,
  volatility: 0.16,
  sharpeRatio: 0.75,
  createdAt: '2023-01-01T00:00:00.000Z',
  updatedAt: '2023-01-01T00:00:00.000Z'
};

export const mockOptimizationResult = {
  weights: {
    AAPL: 0.35,
    MSFT: 0.35,
    GOOGL: 0.30
  },
  expectedReturn: 0.125,
  volatility: 0.155,
  sharpeRatio: 0.806,
  metrics: {
    treynorRatio: 0.08,
    informationRatio: 0.25,
    maxDrawdown: -0.12,
    var95: -0.032,
    cvar95: -0.048
  }
};

export const mockMarketData = {
  prices: {
    AAPL: [
      { date: '2023-01-01', price: 150.0 },
      { date: '2023-01-02', price: 152.0 },
      { date: '2023-01-03', price: 148.0 }
    ],
    MSFT: [
      { date: '2023-01-01', price: 250.0 },
      { date: '2023-01-02', price: 255.0 },
      { date: '2023-01-03', price: 252.0 }
    ]
  },
  returns: {
    AAPL: [0.0133, -0.0263],
    MSFT: [0.02, -0.0118]
  }
};

// Utility functions for tests
export const createMockUser = (overrides = {}) => ({
  id: '1',
  email: 'test@example.com',
  fullName: 'Test User',
  isActive: true,
  createdAt: '2023-01-01T00:00:00.000Z',
  ...overrides
});

export const createMockAsset = (overrides = {}) => ({
  symbol: 'AAPL',
  name: 'Apple Inc.',
  sector: 'Technology',
  currentPrice: 150.0,
  change: 2.5,
  changePercent: 1.67,
  volume: 1000000,
  ...overrides
});

export const waitForLoadingToFinish = () => 
  new Promise((resolve) => setTimeout(resolve, 0));

// Mock API responses
export const mockApiResponse = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

// Mock chart libraries
vi.mock('d3', () => ({
  select: vi.fn(() => ({
    selectAll: vi.fn(() => ({
      data: vi.fn(() => ({
        enter: vi.fn(() => ({
          append: vi.fn(() => ({
            attr: vi.fn(() => ({ attr: vi.fn() })),
            style: vi.fn(() => ({ style: vi.fn() })),
            text: vi.fn(() => ({ text: vi.fn() }))
          }))
        }))
      }))
    })),
    append: vi.fn(() => ({
      attr: vi.fn(() => ({ attr: vi.fn() })),
      style: vi.fn(() => ({ style: vi.fn() }))
    })),
    attr: vi.fn(() => ({ attr: vi.fn() })),
    style: vi.fn(() => ({ style: vi.fn() }))
  })),
  scaleLinear: vi.fn(() => ({
    domain: vi.fn(() => ({ range: vi.fn() })),
    range: vi.fn(() => ({ domain: vi.fn() }))
  })),
  scaleOrdinal: vi.fn(() => ({
    domain: vi.fn(() => ({ range: vi.fn() })),
    range: vi.fn(() => ({ domain: vi.fn() }))
  })),
  axisBottom: vi.fn(),
  axisLeft: vi.fn(),
  line: vi.fn(() => ({
    x: vi.fn(() => ({ y: vi.fn() })),
    y: vi.fn(() => ({ x: vi.fn() }))
  })),
  area: vi.fn(() => ({
    x: vi.fn(() => ({ y0: vi.fn(() => ({ y1: vi.fn() })) }))
  })),
  pie: vi.fn(() => vi.fn()),
  arc: vi.fn(() => ({
    innerRadius: vi.fn(() => ({ outerRadius: vi.fn() })),
    outerRadius: vi.fn(() => ({ innerRadius: vi.fn() }))
  })),
  max: vi.fn(),
  min: vi.fn(),
  extent: vi.fn()
}));

// Mock chart libraries - simple object mocks to avoid JSX parsing issues
vi.mock('recharts', () => ({
  LineChart: vi.fn(() => 'MockedLineChart'),
  Line: vi.fn(() => 'MockedLine'),
  XAxis: vi.fn(() => 'MockedXAxis'),
  YAxis: vi.fn(() => 'MockedYAxis'),
  CartesianGrid: vi.fn(() => 'MockedCartesianGrid'),
  Tooltip: vi.fn(() => 'MockedTooltip'),
  Legend: vi.fn(() => 'MockedLegend'),
  ResponsiveContainer: vi.fn(() => 'MockedResponsiveContainer'),
  BarChart: vi.fn(() => 'MockedBarChart'),
  Bar: vi.fn(() => 'MockedBar'),
  AreaChart: vi.fn(() => 'MockedAreaChart'),
  Area: vi.fn(() => 'MockedArea'),
  PieChart: vi.fn(() => 'MockedPieChart'),
  Pie: vi.fn(() => 'MockedPie'),
  Cell: vi.fn(() => 'MockedCell')
}));