import React, { useState, useCallback } from 'react';
import Card from './Card';

interface StandardCCSenderProps {
  onSend: (message: Uint8Array) => void;
  disabled: boolean;
}

const StandardCCSender: React.FC<StandardCCSenderProps> = ({ onSend, disabled }) => {
  const [ccNumber, setCcNumber] = useState<number>(7); // Default to Volume
  const [ccValue, setCcValue] = useState<number>(100);

  const handleSend = useCallback(() => {
    if (disabled) return;
    // MIDI CC on channel 1 is 0xB0
    const message = new Uint8Array([0xB0, ccNumber, ccValue]);
    onSend(message);
  }, [ccNumber, ccValue, onSend, disabled]);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCcValue(parseInt(e.target.value, 10));
    handleSend();
  };
  
  const handleDebouncedValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCcValue(parseInt(e.target.value, 10));
  };


  return (
    <Card title="Standard CC (7-bit)" className={disabled ? 'opacity-50' : ''}>
      <div className="space-y-4">
        <div>
          <label htmlFor="cc-number" className="block text-sm font-medium text-gray-300">
            CC Number
          </label>
          <input
            type="number"
            id="cc-number"
            min="0"
            max="127"
            value={ccNumber}
            onChange={(e) => setCcNumber(parseInt(e.target.value, 10))}
            className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor="cc-value" className="block text-sm font-medium text-gray-300">
            Value: <span className="font-mono text-blue-400">{ccValue}</span>
          </label>
          <input
            type="range"
            id="cc-value"
            min="0"
            max="127"
            value={ccValue}
            onChange={handleDebouncedValueChange}
            onMouseUp={handleSend}
            onTouchEnd={handleSend}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            disabled={disabled}
          />
        </div>
      </div>
    </Card>
  );
};

export default StandardCCSender;
