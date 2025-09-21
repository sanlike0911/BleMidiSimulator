import React, { useState, useCallback } from 'react';
import Card from './Card';
import XIcon from './icons/XIcon';

interface HighResCCSenderProps {
  id: number;
  onSend: (message: Uint8Array) => void;
  disabled: boolean;
  onRemove: (id: number) => void;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, id: number) => void;
  onDrop: (e: React.DragEvent, id: number) => void;
  onDragEnd: (e: React.DragEvent) => void;
}

const HighResCCSender: React.FC<HighResCCSenderProps> = ({ 
  id, 
  onSend, 
  disabled, 
  onRemove,
  isDragging, 
  onDragStart, 
  onDrop, 
  onDragEnd 
}) => {
  const [msbCc, setMsbCc] = useState<number>(7); // Volume MSB
  const [value14bit, setValue14bit] = useState<number>(12874); // ~100 * 128
  const [description, setDescription] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);

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
        <div className="flex justify-between items-start mb-4 border-b border-gray-700 pb-2">
          <div>
            <h2 className="text-xl font-bold text-gray-200">High-Res CC (14-bit)</h2>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description (e.g., Expression)"
              className="w-full mt-1 text-xs px-2 py-1 bg-gray-700 border border-gray-600 rounded-md text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              disabled={disabled}
              aria-label="Sender description"
            />
          </div>
          <button
            onClick={() => onRemove(id)}
            className="text-gray-500 hover:text-red-400 transition-colors ml-2"
            aria-label="Remove High-Res CC Sender"
            title="Remove Sender"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor={`msb-cc-${id}`} className="block text-sm font-medium text-gray-300">
              MSB CC (0-31) / LSB CC ({msbCc+32})
            </label>
            <input
              type="number"
              id={`msb-cc-${id}`}
              min="0"
              max="31"
              value={msbCc}
              onChange={(e) => setMsbCc(parseInt(e.target.value, 10))}
              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled={disabled}
            />
          </div>
          <div>
            <label htmlFor={`14bit-value-${id}`} className="block text-sm font-medium text-gray-300">
              Value (0-16383): <span className="font-mono text-blue-400">{value14bit}</span>
            </label>
           <input
              type="range"
              id={`14bit-value-${id}`}
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
    </div>
  );
};

export default HighResCCSender;
