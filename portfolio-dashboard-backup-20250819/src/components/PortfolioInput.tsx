import React, { useState, useRef } from 'react';
import { EducationalTooltip } from './EducationalTooltips';

interface Holding {
  symbol: string;
  name: string;
  allocation: number;
  shares?: number;
  value?: number;
}

interface PortfolioInputProps {
  onPortfolioChange: (holdings: Holding[]) => void;
  onRiskToleranceChange: (tolerance: number) => void;
  onInvestmentHorizonChange: (horizon: number) => void;
}

const PortfolioInput: React.FC<PortfolioInputProps> = ({
  onPortfolioChange,
  onRiskToleranceChange,
  onInvestmentHorizonChange
}) => {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [newHolding, setNewHolding] = useState({ symbol: '', allocation: 0 });
  const [riskTolerance, setRiskTolerance] = useState(5);
  const [investmentHorizon, setInvestmentHorizon] = useState(10);
  const [uploadMode, setUploadMode] = useState<'manual' | 'csv'>('manual');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Common stock symbols for autocomplete
  const popularStocks = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corporation' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'META', name: 'Meta Platforms Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation' },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF' },
    { symbol: 'QQQ', name: 'Invesco QQQ Trust' },
    { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF' }
  ];

  const addHolding = () => {
    if (newHolding.symbol && newHolding.allocation > 0) {
      const stock = popularStocks.find(s => s.symbol === newHolding.symbol.toUpperCase());
      const holding: Holding = {
        symbol: newHolding.symbol.toUpperCase(),
        name: stock?.name || newHolding.symbol.toUpperCase(),
        allocation: newHolding.allocation
      };
      
      const updatedHoldings = [...holdings, holding];
      setHoldings(updatedHoldings);
      onPortfolioChange(updatedHoldings);
      setNewHolding({ symbol: '', allocation: 0 });
    }
  };

  const removeHolding = (index: number) => {
    const updatedHoldings = holdings.filter((_, i) => i !== index);
    setHoldings(updatedHoldings);
    onPortfolioChange(updatedHoldings);
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      try {
        const csvHoldings: Holding[] = lines.slice(1).map(line => {
          const [symbol, name, allocation] = line.split(',').map(s => s.trim());
          return {
            symbol: symbol.toUpperCase(),
            name: name || symbol.toUpperCase(),
            allocation: parseFloat(allocation) || 0
          };
        }).filter(h => h.symbol && h.allocation > 0);

        setHoldings(csvHoldings);
        onPortfolioChange(csvHoldings);
      } catch (error) {
        alert('Error parsing CSV file. Please ensure format: Symbol,Name,Allocation');
      }
    };
    reader.readAsText(file);
  };

  const totalAllocation = holdings.reduce((sum, h) => sum + h.allocation, 0);
  const isValidPortfolio = Math.abs(totalAllocation - 100) < 0.01;

  const getRiskToleranceLabel = (value: number) => {
    if (value <= 2) return '🛡️ Conservative';
    if (value <= 4) return '⚖️ Moderate Conservative';
    if (value <= 6) return '📊 Moderate';
    if (value <= 8) return '📈 Moderate Aggressive';
    return '🚀 Aggressive';
  };

  const getHorizonLabel = (years: number) => {
    if (years <= 3) return 'Short-term (≤3 years)';
    if (years <= 7) return 'Medium-term (4-7 years)';
    if (years <= 15) return 'Long-term (8-15 years)';
    return 'Very Long-term (15+ years)';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Portfolio Configuration</h2>
      
      {/* Input Mode Toggle */}
      <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setUploadMode('manual')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            uploadMode === 'manual' 
              ? 'bg-white text-gray-800 shadow-sm' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          ✏️ Manual Entry
        </button>
        <button
          onClick={() => setUploadMode('csv')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            uploadMode === 'csv' 
              ? 'bg-white text-gray-800 shadow-sm' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          📄 CSV Upload
        </button>
      </div>

      {uploadMode === 'csv' && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-2">Upload CSV File</h3>
          <p className="text-sm text-blue-700 mb-3">
            Format: Symbol,Name,Allocation (e.g., AAPL,Apple Inc.,25.5)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
      )}

      {uploadMode === 'manual' && (
        <div className="mb-6">
          <h3 className="font-medium text-gray-800 mb-3">Add Holdings</h3>
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Symbol (e.g., AAPL)"
                value={newHolding.symbol}
                onChange={(e) => setNewHolding({...newHolding, symbol: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                list="stocks"
              />
              <datalist id="stocks">
                {popularStocks.map(stock => (
                  <option key={stock.symbol} value={stock.symbol}>
                    {stock.name}
                  </option>
                ))}
              </datalist>
            </div>
            <div className="w-32">
              <input
                type="number"
                placeholder="Allocation %"
                value={newHolding.allocation || ''}
                onChange={(e) => setNewHolding({...newHolding, allocation: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max="100"
                step="0.1"
              />
            </div>
            <button
              onClick={addHolding}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Current Holdings */}
      {holdings.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-800">Current Holdings</h3>
            <span className={`text-sm font-medium ${
              isValidPortfolio ? 'text-green-600' : 'text-red-600'
            }`}>
              Total: {totalAllocation.toFixed(1)}%
            </span>
          </div>
          <div className="space-y-2">
            {holdings.map((holding, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium text-gray-800">{holding.symbol}</span>
                  <span className="text-sm text-gray-600 ml-2">{holding.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{holding.allocation}%</span>
                  <button
                    onClick={() => removeHolding(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Tolerance */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-medium text-gray-800">
            <EducationalTooltip term="riskTolerance">
              <span className="border-b border-dotted border-gray-400 cursor-help">
                Risk Tolerance
              </span>
            </EducationalTooltip>
          </h3>
          <span className="text-sm text-gray-600">{getRiskToleranceLabel(riskTolerance)}</span>
        </div>
        <div className="px-3">
          <input
            type="range"
            min="1"
            max="10"
            value={riskTolerance}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              setRiskTolerance(value);
              onRiskToleranceChange(value);
            }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Conservative</span>
            <span>Aggressive</span>
          </div>
        </div>
      </div>

      {/* Investment Horizon */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-medium text-gray-800">Investment Horizon</h3>
          <span className="text-sm text-gray-600">{getHorizonLabel(investmentHorizon)}</span>
        </div>
        <div className="px-3">
          <input
            type="range"
            min="1"
            max="30"
            value={investmentHorizon}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              setInvestmentHorizon(value);
              onInvestmentHorizonChange(value);
            }}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1 year</span>
            <span>30+ years</span>
          </div>
        </div>
      </div>

      {/* Portfolio Validation */}
      {holdings.length > 0 && (
        <div className={`p-4 rounded-lg ${
          isValidPortfolio 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <p className={`text-sm ${
            isValidPortfolio ? 'text-green-700' : 'text-yellow-700'
          }`}>
            {isValidPortfolio 
              ? '✅ Portfolio is ready for optimization' 
              : `⚠️ Allocations must sum to 100% (currently ${totalAllocation.toFixed(1)}%)`
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default PortfolioInput;