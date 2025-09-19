import React, { useRef, useEffect } from 'react';
import type { ParsedMidiMessage } from '../types';
import Card from './Card';

interface MidiLogProps {
  messages: ParsedMidiMessage[];
}

const MidiLog: React.FC<MidiLogProps> = ({ messages }) => {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Card title="Received MIDI Messages" className="flex flex-col h-full">
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
