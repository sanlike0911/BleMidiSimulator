import React, { useState, useCallback } from 'react';
import Card from './Card';

interface HighResCCSenderProps {
  onSend: (message: Uint8Array) => void;
  disabled: boolean;
}

const HighResCCSender: React.FC<HighResCCSenderProps> = ({ onSend, disabled }) => {
  const [msbCc, setMsbCc] = useState<number>(7); // Volume MSB
  const [value14bit, setValue14bit] = useState<number>(12874); // ~100 * 128

  const handleSend = useCallback(() => {
    if (disabled) return;
    const lsbCc = msbCc + 32;
    const msbValue = Math.floor(value14bit / 128);
    const lsbValue = value14bit % 128;

    // MIDI CC on channel 1 is 0xB0
    const msbMessage = new Uint8Array([0xB0, msbCc, msbValue]);
    const lsbMessage = new Uint8Array([0xB0, lsbCc, lsbValue]);
    
    onSend(msbMessage);
    onSend(lsbMessage);
  }, [msbCc, value14bit, onSend, disabled]);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue14bit(parseInt(e.target.value, 10));
  };
  
  return (
    <Card title="High-Resolution CC (14-bit)" className={disabled ? 'opacity-50' : ''}>
      <div className="space-y-4">
        <div>
          <label htmlFor="msb-cc" className="block text-sm font-medium text-gray-300">
            MSB CC (0-31) / LSB CC ({msbCc+32})
          </label>
          <input
            type="number"
            id="msb-cc"
            min="0"
            max="31"
            value={msbCc}
            onChange={(e) => setMsbCc(parseInt(e.target.value, 10))}
            className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor="14bit-value" className="block text-sm font-medium text-gray-300">
            Value (0-16383): <span className="font-mono text-blue-400">{value14bit}</span>
          </label>
           <input
            type="range"
            id="14bit-value"
            min="0"
            max="16383"
            value={value14bit}
            onChange={handleValueChange}
            onMouseUp={handleSend}
            onTouchEnd={handleSend}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            disabled={disabled}
          />
        </div>
        <div className="text-xs text-gray-400 font-mono p-3 bg-gray-900 rounded-md">
            <div>MSB Value: {Math.floor(value14bit / 128)}</div>
            <div>LSB Value: {value14bit % 128}</div>
        </div>
      </div>
    </Card>
  );
};

export default HighResCCSender;
