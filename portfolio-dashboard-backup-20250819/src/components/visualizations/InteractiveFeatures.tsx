import React, { useState, useRef, useCallback, useEffect } from 'react';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import * as d3 from 'd3';

// Enhanced Tooltip System
interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  delay?: number;
  isDarkMode?: boolean;
  className?: string;
}

export const EnhancedTooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = 'auto',
  delay = 200,
  isDarkMode = false,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [actualPosition, setActualPosition] = useState(position);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const calculatePosition = useCallback((triggerRect: DOMRect, tooltipRect: DOMRect) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 10;

    let x = 0;
    let y = 0;
    let finalPosition = position;

    if (position === 'auto') {
      // Determine best position based on available space
      const spaceTop = triggerRect.top;
      const spaceBottom = viewportHeight - triggerRect.bottom;
      const spaceLeft = triggerRect.left;
      const spaceRight = viewportWidth - triggerRect.right;

      if (spaceBottom >= tooltipRect.height + margin) {
        finalPosition = 'bottom';
      } else if (spaceTop >= tooltipRect.height + margin) {
        finalPosition = 'top';
      } else if (spaceRight >= tooltipRect.width + margin) {
        finalPosition = 'right';
      } else {
        finalPosition = 'left';
      }
    }

    switch (finalPosition) {
      case 'top':
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.top - tooltipRect.height - margin;
        break;
      case 'bottom':
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.bottom + margin;
        break;
      case 'left':
        x = triggerRect.left - tooltipRect.width - margin;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        break;
      case 'right':
        x = triggerRect.right + margin;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        break;
    }

    // Ensure tooltip stays within viewport
    x = Math.max(margin, Math.min(x, viewportWidth - tooltipRect.width - margin));
    y = Math.max(margin, Math.min(y, viewportHeight - tooltipRect.height - margin));

    return { x, y, position: finalPosition };
  }, [position]);

  const showTooltip = useCallback((event: React.MouseEvent) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current && tooltipRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const { x, y, position } = calculatePosition(triggerRect, tooltipRect);
        
        setTooltipPosition({ x, y });
        setActualPosition(position);
        setIsVisible(true);
      }
    }, delay);
  }, [calculatePosition, delay]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        className={`inline-block ${className}`}
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`fixed z-50 px-3 py-2 text-sm rounded-lg shadow-lg border max-w-xs pointer-events-none transition-opacity duration-200 ${
            isDarkMode
              ? 'bg-gray-800 border-gray-600 text-white'
              : 'bg-white border-gray-200 text-gray-900'
          }`}
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            opacity: isVisible ? 1 : 0
          }}
        >
          {content}
          
          {/* Tooltip arrow */}
          <div
            className={`absolute w-2 h-2 transform rotate-45 ${
              isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
            }`}
            style={{
              [actualPosition === 'top' ? 'bottom' : 
               actualPosition === 'bottom' ? 'top' :
               actualPosition === 'left' ? 'right' : 'left']: '-4px',
              ...(actualPosition === 'top' || actualPosition === 'bottom' 
                ? { left: '50%', marginLeft: '-4px' }
                : { top: '50%', marginTop: '-4px' }
              ),
              borderTopWidth: actualPosition === 'bottom' ? '1px' : '0',
              borderRightWidth: actualPosition === 'left' ? '1px' : '0',
              borderBottomWidth: actualPosition === 'top' ? '1px' : '0',
              borderLeftWidth: actualPosition === 'right' ? '1px' : '0'
            }}
          />
        </div>
      )}
    </>
  );
};

// Synchronized Tooltip System for Multiple Charts
interface SyncedTooltipContextType {
  hoveredData: any;
  setHoveredData: (data: any) => void;
  tooltipPosition: { x: number; y: number };
  setTooltipPosition: (position: { x: number; y: number }) => void;
}

const SyncedTooltipContext = React.createContext<SyncedTooltipContextType | null>(null);

export const SyncedTooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hoveredData, setHoveredData] = useState<any>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  return (
    <SyncedTooltipContext.Provider value={{
      hoveredData,
      setHoveredData,
      tooltipPosition,
      setTooltipPosition
    }}>
      {children}
    </SyncedTooltipContext.Provider>
  );
};

export const useSyncedTooltip = () => {
  const context = React.useContext(SyncedTooltipContext);
  if (!context) {
    throw new Error('useSyncedTooltip must be used within a SyncedTooltipProvider');
  }
  return context;
};

// Brush and Zoom Component
interface BrushZoomProps {
  data: any[];
  children: (props: {
    brushedData: any[];
    zoomTransform: d3.ZoomTransform | null;
    onBrush: (selection: [number, number] | null) => void;
    onZoom: (transform: d3.ZoomTransform) => void;
    onReset: () => void;
  }) => React.ReactNode;
  xAccessor: (d: any) => Date | number;
  margin?: { top: number; right: number; bottom: number; left: number };
  brushHeight?: number;
  className?: string;
}

export const BrushZoom: React.FC<BrushZoomProps> = ({
  data,
  children,
  xAccessor,
  margin = { top: 20, right: 30, bottom: 40, left: 40 },
  brushHeight = 60,
  className = ''
}) => {
  const [brushSelection, setBrushSelection] = useState<[number, number] | null>(null);
  const [zoomTransform, setZoomTransform] = useState<d3.ZoomTransform | null>(null);
  const brushRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<SVGGElement>(null);

  const brushedData = useMemo(() => {
    if (!brushSelection || !data.length) return data;

    const xScale = d3.scaleTime()
      .domain(d3.extent(data, xAccessor) as [Date, Date])
      .range([0, 800]); // Assuming 800px width

    const [x0, x1] = brushSelection.map(xScale.invert);
    
    return data.filter(d => {
      const x = xAccessor(d);
      return x >= x0 && x <= x1;
    });
  }, [data, brushSelection, xAccessor]);

  const handleBrush = useCallback((selection: [number, number] | null) => {
    setBrushSelection(selection);
  }, []);

  const handleZoom = useCallback((transform: d3.ZoomTransform) => {
    setZoomTransform(transform);
  }, []);

  const handleReset = useCallback(() => {
    setBrushSelection(null);
    setZoomTransform(null);
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      {children({
        brushedData,
        zoomTransform,
        onBrush: handleBrush,
        onZoom: handleZoom,
        onReset: handleReset
      })}
      
      {/* Reset button */}
      {(brushSelection || zoomTransform) && (
        <div className="flex justify-center">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Reset View
          </button>
        </div>
      )}
    </div>
  );
};

// Chart Export Functionality
interface ExportOptions {
  format: 'png' | 'svg' | 'pdf';
  filename?: string;
  width?: number;
  height?: number;
  quality?: number;
}

export const useChartExport = () => {
  const exportChart = useCallback(async (
    elementRef: React.RefObject<HTMLElement>,
    options: ExportOptions
  ) => {
    if (!elementRef.current) {
      throw new Error('Element reference is not available');
    }

    const { format, filename = 'chart', width, height, quality = 1 } = options;
    const element = elementRef.current;

    try {
      if (format === 'png') {
        const canvas = await html2canvas(element, {
          backgroundColor: null,
          scale: quality,
          width,
          height,
          useCORS: true,
          allowTaint: true
        });

        canvas.toBlob((blob) => {
          if (blob) {
            saveAs(blob, `${filename}.png`);
          }
        });
      } else if (format === 'svg') {
        // For SVG export, we need to clone the SVG and serialize it
        const svgElement = element.querySelector('svg');
        if (svgElement) {
          const svgClone = svgElement.cloneNode(true) as SVGElement;
          const serializer = new XMLSerializer();
          const svgString = serializer.serializeToString(svgClone);
          const blob = new Blob([svgString], { type: 'image/svg+xml' });
          saveAs(blob, `${filename}.svg`);
        }
      } else if (format === 'pdf') {
        // For PDF, convert to canvas first then to PDF
        const canvas = await html2canvas(element, {
          backgroundColor: null,
          scale: quality,
          width,
          height
        });

        // This would require a PDF library like jsPDF
        console.warn('PDF export requires jsPDF library integration');
      }
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }, []);

  return { exportChart };
};

// Export Button Component
interface ExportButtonProps {
  elementRef: React.RefObject<HTMLElement>;
  filename?: string;
  className?: string;
  isDarkMode?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  elementRef,
  filename = 'chart',
  className = '',
  isDarkMode = false
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { exportChart } = useChartExport();

  const handleExport = async (format: 'png' | 'svg') => {
    setIsExporting(true);
    setShowMenu(false);
    
    try {
      await exportChart(elementRef, { format, filename });
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isDarkMode
            ? 'bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400'
        }`}
      >
        {isExporting ? (
          <>
            <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
            Exporting...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
          </>
        )}
      </button>

      {showMenu && (
        <div className={`absolute right-0 top-full mt-1 w-32 rounded-lg shadow-lg border z-50 ${
          isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
        }`}>
          <button
            onClick={() => handleExport('png')}
            className={`w-full text-left px-4 py-2 text-sm rounded-t-lg transition-colors ${
              isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            PNG Image
          </button>
          <button
            onClick={() => handleExport('svg')}
            className={`w-full text-left px-4 py-2 text-sm rounded-b-lg transition-colors ${
              isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            SVG Vector
          </button>
        </div>
      )}

      {/* Backdrop to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};

// Dark Mode Toggle
interface DarkModeToggleProps {
  isDarkMode: boolean;
  onToggle: (isDarkMode: boolean) => void;
  className?: string;
}

export const DarkModeToggle: React.FC<DarkModeToggleProps> = ({
  isDarkMode,
  onToggle,
  className = ''
}) => {
  return (
    <button
      onClick={() => onToggle(!isDarkMode)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        isDarkMode ? 'bg-blue-600' : 'bg-gray-200'
      } ${className}`}
      role="switch"
      aria-checked={isDarkMode}
      aria-label="Toggle dark mode"
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          isDarkMode ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
      <span className="sr-only">
        {isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      </span>
    </button>
  );
};

// Responsive Container Hook
export const useResponsiveContainer = () => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        setDimensions({ width: offsetWidth, height: offsetHeight });
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return { containerRef, dimensions };
};

// Keyboard Navigation Hook
export const useKeyboardNavigation = (
  items: any[],
  onSelect: (item: any, index: number) => void,
  isActive: boolean = true
) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => Math.min(items.length - 1, prev + 1));
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (items[selectedIndex]) {
            onSelect(items[selectedIndex], selectedIndex);
          }
          break;
        case 'Home':
          event.preventDefault();
          setSelectedIndex(0);
          break;
        case 'End':
          event.preventDefault();
          setSelectedIndex(items.length - 1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, onSelect, isActive, selectedIndex]);

  return { selectedIndex, setSelectedIndex };
};

// Accessibility Announcer
export const AccessibilityAnnouncer: React.FC<{
  message: string;
  priority?: 'polite' | 'assertive';
}> = ({ message, priority = 'polite' }) => {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    setAnnouncement(message);
    const timer = setTimeout(() => setAnnouncement(''), 1000);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
};

// Chart Container with Interactive Features
interface InteractiveChartContainerProps {
  children: React.ReactNode;
  title?: string;
  exportFilename?: string;
  isDarkMode?: boolean;
  onDarkModeToggle?: (isDarkMode: boolean) => void;
  className?: string;
  enableExport?: boolean;
  enableFullscreen?: boolean;
}

export const InteractiveChartContainer: React.FC<InteractiveChartContainerProps> = ({
  children,
  title,
  exportFilename = 'chart',
  isDarkMode = false,
  onDarkModeToggle,
  className = '',
  enableExport = true,
  enableFullscreen = true
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative rounded-lg border ${
        isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
      } ${isFullscreen ? 'fixed inset-0 z-50' : ''} ${className}`}
    >
      {/* Header */}
      {(title || enableExport || enableFullscreen || onDarkModeToggle) && (
        <div className={`flex items-center justify-between p-4 border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div>
            {title && (
              <h3 className={`text-lg font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {title}
              </h3>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {onDarkModeToggle && (
              <EnhancedTooltip
                content="Toggle dark mode"
                isDarkMode={isDarkMode}
              >
                <DarkModeToggle
                  isDarkMode={isDarkMode}
                  onToggle={onDarkModeToggle}
                />
              </EnhancedTooltip>
            )}
            
            {enableExport && (
              <ExportButton
                elementRef={containerRef}
                filename={exportFilename}
                isDarkMode={isDarkMode}
              />
            )}
            
            {enableFullscreen && (
              <EnhancedTooltip
                content={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                isDarkMode={isDarkMode}
              >
                <button
                  onClick={toggleFullscreen}
                  className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                    isDarkMode
                      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isFullscreen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5m11 5.5V4.5M15 9h4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5m11-5.5v4.5m0-4.5h4.5m0 0l-5.5 5.5" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7V4a1 1 0 011-1h3m0 0V4m0-1h9m-9 1h9m0 0v3M7 3v1m10-1v1M7 21H4a1 1 0 01-1-1v-3m0 0h3m-3 0v-3m17 3v-3M21 7v10a1 1 0 01-1 1h-3m0 0v-3m0 3H8" />
                    )}
                  </svg>
                </button>
              </EnhancedTooltip>
            )}
          </div>
        </div>
      )}
      
      {/* Content */}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};

export default {
  EnhancedTooltip,
  SyncedTooltipProvider,
  useSyncedTooltip,
  BrushZoom,
  useChartExport,
  ExportButton,
  DarkModeToggle,
  useResponsiveContainer,
  useKeyboardNavigation,
  AccessibilityAnnouncer,
  InteractiveChartContainer
};