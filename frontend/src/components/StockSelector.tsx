import React, { useState } from 'react';

interface Stock {
  symbol: string;
  name: string;
  sector?: string;
}

interface SelectedStock extends Stock {
  allocation: number;
}

interface StockSelectorProps {
  selectedStocks: SelectedStock[];
  onSelectionChange: (stocks: SelectedStock[]) => void;
}

const POPULAR_STOCKS: Stock[] = [
  // Tech Giants
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Technology' },
  { symbol: 'META', name: 'Meta Platforms', sector: 'Technology' },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology' },
  
  // Finance
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Finance' },
  { symbol: 'BAC', name: 'Bank of America', sector: 'Finance' },
  { symbol: 'WFC', name: 'Wells Fargo', sector: 'Finance' },
  { symbol: 'GS', name: 'Goldman Sachs', sector: 'Finance' },
  
  // Healthcare
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare' },
  { symbol: 'PFE', name: 'Pfizer Inc.', sector: 'Healthcare' },
  { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare' },
  
  // Consumer
  { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Consumer' },
  { symbol: 'PG', name: 'Procter & Gamble', sector: 'Consumer' },
  { symbol: 'KO', name: 'Coca-Cola Co.', sector: 'Consumer' },
  { symbol: 'PEP', name: 'PepsiCo Inc.', sector: 'Consumer' },
  
  // Industrial
  { symbol: 'GE', name: 'General Electric', sector: 'Industrial' },
  { symbol: 'MMM', name: '3M Company', sector: 'Industrial' },
  
  // Energy
  { symbol: 'XOM', name: 'Exxon Mobil', sector: 'Energy' },
  { symbol: 'CVX', name: 'Chevron Corp.', sector: 'Energy' }
];

export const StockSelector: React.FC<StockSelectorProps> = ({ 
  selectedStocks, 
  onSelectionChange 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredStocks = POPULAR_STOCKS.filter(stock =>
    stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stock.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(stock => 
    !selectedStocks.some(selected => selected.symbol === stock.symbol)
  );

  const addStock = (stock: Stock) => {
    const newStock: SelectedStock = {
      ...stock,
      allocation: selectedStocks.length === 0 ? 100 : 
                 Math.max(0, 100 - selectedStocks.reduce((sum, s) => sum + s.allocation, 0))
    };
    
    if (selectedStocks.length < 10) { // Limit to 10 stocks
      onSelectionChange([...selectedStocks, newStock]);
    }
    setSearchTerm('');
    setShowDropdown(false);
  };

  const removeStock = (symbolToRemove: string) => {
    const filtered = selectedStocks.filter(stock => stock.symbol !== symbolToRemove);
    onSelectionChange(filtered);
  };

  const updateAllocation = (symbol: string, allocation: number) => {
    const updated = selectedStocks.map(stock =>
      stock.symbol === symbol ? { ...stock, allocation: Math.max(0, Math.min(100, allocation)) } : stock
    );
    onSelectionChange(updated);
  };

  const redistributeEqually = () => {
    const equalAllocation = selectedStocks.length > 0 ? 100 / selectedStocks.length : 0;
    const updated = selectedStocks.map(stock => ({ ...stock, allocation: equalAllocation }));
    onSelectionChange(updated);
  };

  const totalAllocation = selectedStocks.reduce((sum, stock) => sum + stock.allocation, 0);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Select Stocks</h2>
        <div className="flex gap-2">
          <button
            onClick={redistributeEqually}
            disabled={selectedStocks.length === 0}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Equal Weight
          </button>
          <span className={`text-sm font-medium ${
            Math.abs(totalAllocation - 100) < 0.1 ? 'text-green-600' : 'text-red-600'
          }`}>
            {totalAllocation.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Stock Search */}
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Search stocks (e.g., AAPL, Apple)..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(e.target.value.length > 0);
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        
        {showDropdown && searchTerm && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {filteredStocks.length > 0 ? (
              filteredStocks.slice(0, 8).map(stock => (
                <button
                  key={stock.symbol}
                  onClick={() => addStock(stock)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium text-gray-900">{stock.symbol}</span>
                      <span className="text-sm text-gray-600 ml-2">{stock.name}</span>
                    </div>
                    {stock.sector && (
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {stock.sector}
                      </span>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-2 text-gray-500 text-sm">No stocks found</div>
            )}
          </div>
        )}
      </div>

      {/* Selected Stocks */}
      <div className="space-y-3">
        {selectedStocks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No stocks selected</p>
            <p className="text-xs mt-1">Search and add stocks to build your portfolio</p>
          </div>
        ) : (
          selectedStocks.map(stock => (
            <div key={stock.symbol} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900">{stock.symbol}</span>
                  <span className="text-sm text-gray-600">{stock.name}</span>
                  {stock.sector && (
                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                      {stock.sector}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={stock.allocation.toFixed(1)}
                  onChange={(e) => updateAllocation(stock.symbol, parseFloat(e.target.value) || 0)}
                  className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">%</span>
                <button
                  onClick={() => removeStock(stock.symbol)}
                  className="ml-2 text-red-500 hover:text-red-700 focus:outline-none"
                  title="Remove stock"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Add Buttons */}
      <div className="mt-4">
        <p className="text-sm text-gray-600 mb-2">Quick Add Popular Stocks:</p>
        <div className="flex flex-wrap gap-2">
          {['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'].map(symbol => {
            const stock = POPULAR_STOCKS.find(s => s.symbol === symbol);
            const isSelected = selectedStocks.some(s => s.symbol === symbol);
            
            return (
              <button
                key={symbol}
                onClick={() => stock && !isSelected && addStock(stock)}
                disabled={isSelected || selectedStocks.length >= 10}
                className={`px-3 py-1 text-xs rounded-md ${
                  isSelected 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {symbol} {isSelected ? '✓' : '+'}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};