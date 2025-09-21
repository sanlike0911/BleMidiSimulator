import React, { useRef, useEffect } from 'react';
import type { ParsedMidiMessage } from '../types';
import Card from './Card';

interface MidiLogProps {
  messages: ParsedMidiMessage[];
  onClear: () => void;
}

const MidiLog: React.FC<MidiLogProps> = ({ messages, onClear }) => {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Card className="flex flex-col h-full">
        <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
            <h2 className="text-xl font-bold text-gray-200">Received MIDI Messages</h2>
            <button
                onClick={onClear}
                className="px-3 py-1 text-xs font-semibold text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-colors"
                aria-label="Clear MIDI message log"
            >
                Clear Log
            </button>
        </div>
        <div className="flex-grow h-96 bg-gray-900 rounded-md p-2 overflow-y-auto font-mono text-xs">
            {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                    Waiting for messages...
                </div>
            ) : (
                messages.map((msg) => (
                    <div key={msg.id} className="text-gray-300 mb-1">
                        <span className="text-gray-500">{msg.timestamp} | </span>
                        <span className="text-green-400">{msg.description}</span>
                    </div>
                ))
            )}
            <div ref={logEndRef} />
        </div>
    </Card>
  );
};

export default MidiLog;
