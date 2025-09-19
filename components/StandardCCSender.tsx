import React, { useState, useCallback } from 'react';
import Card from './Card';
import XIcon from './icons/XIcon';

interface StandardCCSenderProps {
  id: number;
  onSend: (message: Uint8Array) => void;
  disabled: boolean;
  onRemove: (id: number) => void;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, id: number) => void;
  onDrop: (e: React.DragEvent, id: number) => void;
  onDragEnd: (e: React.DragEvent) => void;
}

const StandardCCSender: React.FC<StandardCCSenderProps> = ({ 
  id, 
  onSend, 
  disabled, 
  onRemove, 
  isDragging, 
  onDragStart, 
  onDrop, 
  onDragEnd 
}) => {
  const [ccNumber, setCcNumber] = useState<number>(7); // Default to Volume
  const [ccValue, setCcValue] = useState<number>(100);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleSend = useCallback(() => {
    if (disabled) return;
    // MIDI CC on channel 1 is 0xB0
    const message = new Uint8Array([0xB0, ccNumber, ccValue]);
    onSend(message);
  }, [ccNumber, ccValue, onSend, disabled]);
  
  const handleDebouncedValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCcValue(parseInt(e.target.value, 10));
  };

  return (
    <div
      draggable={!disabled}
      onDragStart={(e) => onDragStart(e, id)}
      onDrop={(e) => {
        onDrop(e, id);
        setIsDragOver(false);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDragEnd={onDragEnd}
      className={`h-full transition-all duration-200 cursor-grab ${isDragging ? 'opacity-30' : 'opacity-100'} ${isDragOver ? 'ring-2 ring-blue-500 rounded-lg' : ''}`}
    >
      <Card className={`h-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
          <h2 className="text-xl font-bold text-gray-200">Standard CC (7-bit)</h2>
          <button
            onClick={() => onRemove(id)}
            className="text-gray-500 hover:text-red-400 transition-colors"
            aria-label="Remove Standard CC Sender"
            title="Remove Sender"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor={`cc-number-${id}`} className="block text-sm font-medium text-gray-300">
              CC Number
            </label>
            <input
              type="number"
              id={`cc-number-${id}`}
              min="0"
              max="127"
              value={ccNumber}
              onChange={(e) => setCcNumber(parseInt(e.target.value, 10))}
              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled={disabled}
            />
          </div>
          <div>
            <label htmlFor={`cc-value-${id}`} className="block text-sm font-medium text-gray-300">
              Value: <span className="font-mono text-blue-400">{ccValue}</span>
            </label>
            <input
              type="range"
              id={`cc-value-${id}`}
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
          {/* Placeholder to match height with HighResCCSender */}
          <div className="text-xs font-mono p-3 rounded-md invisible" aria-hidden="true">
            <div>&nbsp;</div>
            <div>&nbsp;</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StandardCCSender;
