import React, { useState, useCallback, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { debounce } from 'lodash';
import { usePortfolio, portfolioActions, portfolioSelectors, Holding } from '../contexts/PortfolioContext';

interface AssetSearchResult {
  symbol: string;
  name: string;
  sector?: string;
  current_price?: number;
  market_cap?: number;
}

interface FormData {
  holdings: Holding[];
  riskTolerance: number;
  investmentHorizon: number;
  optimizationMethod: 'mean_variance' | 'black_litterman' | 'risk_parity' | 'hierarchical_risk_parity';
}

const PortfolioInputForm: React.FC = () => {
  const { state, dispatch } = usePortfolio();
  const [searchResults, setSearchResults] = useState<AssetSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm<FormData>({
    defaultValues: {
      holdings: state.holdings.length > 0 ? state.holdings : [{ symbol: '', allocation: 0 }],
      riskTolerance: state.riskTolerance,
      investmentHorizon: state.investmentHorizon,
      optimizationMethod: state.selectedOptimizationMethod,
    },
    mode: 'onChange'
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'holdings'
  });

  const watchedHoldings = watch('holdings');
  const totalAllocation = portfolioSelectors.getTotalAllocation(watchedHoldings);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 1) {
        setSearchResults([]);
        return;
      }

      setSearchLoading(true);
      try {
        // Mock API call for now - replace with actual API
        const response = await fetch(`/api/assets/search?q=${encodeURIComponent(query)}&limit=8`);
        if (response.ok) {
          const results = await response.json();
          setSearchResults(results);
        }
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300),
    []
  );

  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);
    setShowDropdown(true);
    debouncedSearch(value);
  };

  const handleSelectAsset = (asset: AssetSearchResult) => {
    // Check if asset already exists
    const existingIndex = watchedHoldings.findIndex(h => h.symbol === asset.symbol);
    
    if (existingIndex === -1) {
      append({
        symbol: asset.symbol,
        name: asset.name,
        allocation: 0,
        sector: asset.sector
      });
    }
    
    setSearchQuery('');
    setShowDropdown(false);
    setSearchResults([]);
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          throw new Error('CSV must have header and at least one data row');
        }

        // Parse CSV (assuming format: Symbol,Name,Allocation)
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const symbolIndex = headers.findIndex(h => h.includes('symbol') || h.includes('ticker'));
        const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('company'));
        const allocationIndex = headers.findIndex(h => h.includes('allocation') || h.includes('weight') || h.includes('percent'));

        if (symbolIndex === -1 || allocationIndex === -1) {
          throw new Error('CSV must include Symbol and Allocation columns');
        }

        const newHoldings: Holding[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          
          if (values.length > Math.max(symbolIndex, allocationIndex)) {
            const symbol = values[symbolIndex].toUpperCase();
            const name = nameIndex >= 0 ? values[nameIndex] : symbol;
            const allocation = parseFloat(values[allocationIndex]);
            
            if (symbol && !isNaN(allocation) && allocation > 0) {
              newHoldings.push({
                symbol,
                name,
                allocation
              });
            }
          }
        }

        if (newHoldings.length === 0) {
          throw new Error('No valid holdings found in CSV');
        }

        setValue('holdings', newHoldings);
        dispatch(portfolioActions.setError(null));
      } catch (error) {
        dispatch(portfolioActions.setError(`CSV import failed: ${error.message}`));
      }
    };

    reader.readAsText(file);
  };

  const onSubmit = (data: FormData) => {
    // Update context with form data
    dispatch(portfolioActions.setHoldings(data.holdings));
    dispatch(portfolioActions.setRiskTolerance(data.riskTolerance));
    dispatch(portfolioActions.setInvestmentHorizon(data.investmentHorizon));
    dispatch(portfolioActions.setOptimizationMethod(data.optimizationMethod));
    
    // Here you would trigger the optimization API call
    console.log('Portfolio data ready for optimization:', data);
  };

  const getRiskToleranceColor = (value: number) => {
    if (value <= 2) return 'bg-green-500';
    if (value <= 4) return 'bg-yellow-500';
    if (value <= 6) return 'bg-orange-500';
    if (value <= 8) return 'bg-red-500';
    return 'bg-red-700';
  };

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-6">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Portfolio Configuration</h2>
          <p className="text-gray-600">Configure your current portfolio holdings and preferences</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8">
          {/* Asset Search */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search & Add Assets
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Search by symbol or company name..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  
                  {searchLoading && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  )}

                  {/* Dropdown */}
                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {searchResults.map((asset) => (
                        <button
                          key={asset.symbol}
                          type="button"
                          onClick={() => handleSelectAsset(asset)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-semibold text-gray-900">{asset.symbol}</div>
                          <div className="text-sm text-gray-600">{asset.name}</div>
                          {asset.sector && (
                            <div className="text-xs text-gray-500">{asset.sector}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="sm:w-auto">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Import CSV
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Upload CSV
                </button>
              </div>
            </div>
          </div>

          {/* Holdings List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Current Holdings</h3>
              <div className={`text-sm font-medium px-3 py-1 rounded-full ${
                Math.abs(totalAllocation - 100) < 0.01 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                Total: {totalAllocation.toFixed(1)}%
              </div>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex flex-col sm:flex-row gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <Controller
                      name={`holdings.${index}.symbol`}
                      control={control}
                      rules={{ required: 'Symbol is required' }}
                      render={({ field }) => (
                        <input
                          {...field}
                          placeholder="Symbol"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      )}
                    />
                    {errors.holdings?.[index]?.symbol && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.holdings[index].symbol.message}
                      </p>
                    )}
                  </div>

                  <div className="flex-1">
                    <Controller
                      name={`holdings.${index}.name`}
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          placeholder="Company Name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      )}
                    />
                  </div>

                  <div className="w-full sm:w-32">
                    <Controller
                      name={`holdings.${index}.allocation`}
                      control={control}
                      rules={{ 
                        required: 'Allocation is required',
                        min: { value: 0, message: 'Must be positive' },
                        max: { value: 100, message: 'Cannot exceed 100%' }
                      }}
                      render={({ field }) => (
                        <div className="relative">
                          <input
                            {...field}
                            type="number"
                            placeholder="0"
                            min="0"
                            max="100"
                            step="0.1"
                            className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <span className="absolute right-3 top-2 text-gray-500 text-sm">%</span>
                        </div>
                      )}
                    />
                    {errors.holdings?.[index]?.allocation && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.holdings[index].allocation.message}
                      </p>
                    )}
                  </div>

                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="w-full sm:w-auto px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => append({ symbol: '', allocation: 0 })}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
            >
              + Add Another Holding
            </button>
          </div>

          {/* Risk Tolerance */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Risk Tolerance</h3>
              <Controller
                name="riskTolerance"
                control={control}
                render={({ field }) => (
                  <span className="text-sm font-medium text-gray-600">
                    {field.value}/10 - {portfolioSelectors.getRiskToleranceLabel(field.value)}
                  </span>
                )}
              />
            </div>
            
            <Controller
              name="riskTolerance"
              control={control}
              render={({ field }) => (
                <div className="space-y-3">
                  <input
                    {...field}
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  
                  {/* Risk indicator */}
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Conservative</span>
                    <div className={`w-4 h-4 rounded-full ${getRiskToleranceColor(field.value)}`}></div>
                    <span>Aggressive</span>
                  </div>
                </div>
              )}
            />
          </div>

          {/* Investment Horizon */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Investment Horizon</h3>
              <Controller
                name="investmentHorizon"
                control={control}
                render={({ field }) => (
                  <span className="text-sm font-medium text-gray-600">
                    {field.value} years - {portfolioSelectors.getInvestmentHorizonLabel(field.value)}
                  </span>
                )}
              />
            </div>

            <Controller
              name="investmentHorizon"
              control={control}
              render={({ field }) => (
                <div className="space-y-3">
                  <input
                    {...field}
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>1 year</span>
                    <span>30+ years</span>
                  </div>
                </div>
              )}
            />
          </div>

          {/* Optimization Method */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Optimization Method</h3>
            
            <Controller
              name="optimizationMethod"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { value: 'mean_variance', label: 'Mean-Variance', description: 'Maximize risk-adjusted returns' },
                    { value: 'black_litterman', label: 'Black-Litterman', description: 'Incorporate market views' },
                    { value: 'risk_parity', label: 'Risk Parity', description: 'Equal risk contribution' },
                    { value: 'hierarchical_risk_parity', label: 'Hierarchical Risk Parity', description: 'Cluster-based allocation' }
                  ].map((method) => (
                    <label key={method.value} className="relative">
                      <input
                        type="radio"
                        {...field}
                        value={method.value}
                        checked={field.value === method.value}
                        className="sr-only"
                      />
                      <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        field.value === method.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <div className="font-semibold text-gray-900">{method.label}</div>
                        <div className="text-sm text-gray-600 mt-1">{method.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Error Display */}
          {state.error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{state.error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={!isValid || Math.abs(totalAllocation - 100) > 0.01 || state.isLoading}
              className="flex-1 py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {state.isLoading ? 'Optimizing...' : 'Optimize Portfolio'}
            </button>
            
            <button
              type="button"
              onClick={() => dispatch(portfolioActions.resetPortfolio())}
              className="sm:w-auto py-3 px-6 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PortfolioInputForm;