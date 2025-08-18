import React from 'react';
import PortfolioPieChart from './PortfolioPieChart';

// Example usage of the PortfolioPieChart component
const ExampleUsage: React.FC = () => {
  const sampleHoldings = [
    { symbol: 'AAPL', allocation: 30, value: 50000 },
    { symbol: 'GOOGL', allocation: 25, value: 41667 },
    { symbol: 'MSFT', allocation: 25, value: 41667 },
    { symbol: 'AMZN', allocation: 20, value: 33333 }
  ];

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        Portfolio Pie Chart Example
      </h1>
      
      {/* Basic usage */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Basic Usage
        </h2>
        <PortfolioPieChart holdings={sampleHoldings} />
      </div>
      
      {/* Custom styling */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          With Custom Styling
        </h2>
        <PortfolioPieChart 
          holdings={sampleHoldings} 
          className="max-w-2xl mx-auto"
        />
      </div>
      
      {/* In a grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Side by Side Comparison
          </h2>
          <PortfolioPieChart holdings={sampleHoldings} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Different Portfolio
          </h2>
          <PortfolioPieChart 
            holdings={[
              { symbol: 'TSLA', allocation: 40, value: 40000 },
              { symbol: 'NVDA', allocation: 35, value: 35000 },
              { symbol: 'AMD', allocation: 25, value: 25000 }
            ]} 
          />
        </div>
      </div>
    </div>
  );
};

export default ExampleUsage;