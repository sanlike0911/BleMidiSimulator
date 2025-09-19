import React, { useState, useCallback } from 'react';

interface AdvancedMidiSenderProps {
  onSend: (message: Uint8Array) => Promise<void>;
  disabled: boolean;
}

type MidiMessageType = 'note' | 'cc' | 'program' | 'pitchBend' | 'aftertouch' | 'sysex' | 'clock';

interface MidiMessage {
  type: MidiMessageType;
  channel: number;
  data1?: number;
  data2?: number;
  sysexData?: number[];
}

const AdvancedMidiSender: React.FC<AdvancedMidiSenderProps> = ({
  onSend,
  disabled
}) => {
  const [messageType, setMessageType] = useState<MidiMessageType>('note');
  const [channel, setChannel] = useState(1);
  const [data1, setData1] = useState(60); // Note/CC number
  const [data2, setData2] = useState(100); // Velocity/Value
  const [programNumber, setProgramNumber] = useState(0);
  const [pitchBendValue, setPitchBendValue] = useState(8192); // Center value
  const [sysexData, setSysexData] = useState('F0 7F 7F 04 01 00 7F F7'); // Sample SysEx
  const [isLoading, setIsLoading] = useState(false);

  const createMidiMessage = useCallback((msg: MidiMessage): Uint8Array => {
    const ch = msg.channel - 1; // Convert to 0-based

    switch (msg.type) {
      case 'note':
        return new Uint8Array([0x90 | ch, msg.data1 || 60, msg.data2 || 100]);

      case 'cc':
        return new Uint8Array([0xB0 | ch, msg.data1 || 7, msg.data2 || 100]);

      case 'program':
        return new Uint8Array([0xC0 | ch, msg.data1 || 0]);

      case 'pitchBend':
        const bendValue = msg.data1 || 8192;
        const lsb = bendValue & 0x7F;
        const msb = (bendValue >> 7) & 0x7F;
        return new Uint8Array([0xE0 | ch, lsb, msb]);

      case 'aftertouch':
        return new Uint8Array([0xD0 | ch, msg.data1 || 100]);

      case 'sysex':
        return new Uint8Array(msg.sysexData || [0xF0, 0x7F, 0x7F, 0x04, 0x01, 0x00, 0x7F, 0xF7]);

      case 'clock':
        return new Uint8Array([0xF8]); // MIDI Clock

      default:
        throw new Error(`Unsupported message type: ${msg.type}`);
    }
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);

    try {
      let message: MidiMessage;

      switch (messageType) {
        case 'note':
          message = { type: 'note', channel, data1, data2 };
          break;
        case 'cc':
          message = { type: 'cc', channel, data1, data2 };
          break;
        case 'program':
          message = { type: 'program', channel, data1: programNumber };
          break;
        case 'pitchBend':
          message = { type: 'pitchBend', channel, data1: pitchBendValue };
          break;
        case 'aftertouch':
          message = { type: 'aftertouch', channel, data1: data2 };
          break;
        case 'sysex':
          const sysexBytes = sysexData
            .split(' ')
            .map(hex => parseInt(hex, 16))
            .filter(byte => !isNaN(byte) && byte >= 0 && byte <= 255);
          message = { type: 'sysex', channel, sysexData: sysexBytes };
          break;
        case 'clock':
          message = { type: 'clock', channel };
          break;
        default:
          throw new Error(`Unsupported message type: ${messageType}`);
      }

      const midiMessage = createMidiMessage(message);
      await onSend(midiMessage);

      console.log(`Sent ${messageType} message:`, Array.from(midiMessage));
    } catch (error) {
      console.error('Failed to send MIDI message:', error);
    } finally {
      setIsLoading(false);
    }
  }, [messageType, channel, data1, data2, programNumber, pitchBendValue, sysexData, createMidiMessage, onSend, disabled, isLoading]);

  const handleSendNoteSequence = useCallback(async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);

    try {
      // Send a simple C major scale
      const notes = [60, 62, 64, 65, 67, 69, 71, 72]; // C4 to C5

      for (const note of notes) {
        // Note On
        const noteOn = createMidiMessage({
          type: 'note',
          channel,
          data1: note,
          data2: 100
        });
        await onSend(noteOn);

        // Wait 200ms
        await new Promise(resolve => setTimeout(resolve, 200));

        // Note Off
        const noteOff = createMidiMessage({
          type: 'note',
          channel,
          data1: note,
          data2: 0
        });
        await onSend(noteOff);

        // Wait 50ms before next note
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      console.log('Sent note sequence');
    } catch (error) {
      console.error('Failed to send note sequence:', error);
    } finally {
      setIsLoading(false);
    }
  }, [channel, createMidiMessage, onSend, disabled, isLoading]);

  const handleSendCCRamp = useCallback(async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);

    try {
      // Send CC ramp from 0 to 127
      for (let value = 0; value <= 127; value += 5) {
        const ccMessage = createMidiMessage({
          type: 'cc',
          channel,
          data1: data1,
          data2: value
        });
        await onSend(ccMessage);

        // Wait 100ms between values
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`Sent CC ramp for controller ${data1}`);
    } catch (error) {
      console.error('Failed to send CC ramp:', error);
    } finally {
      setIsLoading(false);
    }
  }, [channel, data1, createMidiMessage, onSend, disabled, isLoading]);

  const validateSysEx = (data: string): boolean => {
    try {
      const bytes = data.split(' ').map(hex => parseInt(hex, 16));
      return bytes.length >= 2 && bytes[0] === 0xF0 && bytes[bytes.length - 1] === 0xF7;
    } catch {
      return false;
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Advanced MIDI Sender</h3>
        {isLoading && (
          <div className="flex items-center space-x-2 text-yellow-400">
            <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm">Sending...</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Message Type Selection */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(['note', 'cc', 'program', 'pitchBend', 'aftertouch', 'sysex', 'clock'] as MidiMessageType[]).map(type => (
            <button
              key={type}
              onClick={() => setMessageType(type)}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                messageType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
              disabled={disabled}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {/* Channel Selection */}
        {messageType !== 'sysex' && messageType !== 'clock' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              MIDI Channel
            </label>
            <input
              type="number"
              min="1"
              max="16"
              value={channel}
              onChange={(e) => setChannel(Number(e.target.value))}
              className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={disabled}
            />
          </div>
        )}

        {/* Message-specific parameters */}
        {messageType === 'note' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Note Number (0-127)
              </label>
              <input
                type="number"
                min="0"
                max="127"
                value={data1}
                onChange={(e) => setData1(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={disabled}
              />
              <p className="text-xs text-gray-500 mt-1">Middle C = 60</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Velocity (0-127)
              </label>
              <input
                type="number"
                min="0"
                max="127"
                value={data2}
                onChange={(e) => setData2(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={disabled}
              />
              <p className="text-xs text-gray-500 mt-1">0 = Note Off</p>
            </div>
          </div>
        )}

        {messageType === 'cc' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Controller Number (0-127)
              </label>
              <input
                type="number"
                min="0"
                max="127"
                value={data1}
                onChange={(e) => setData1(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={disabled}
              />
              <p className="text-xs text-gray-500 mt-1">7 = Volume, 1 = Modulation</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Value (0-127)
              </label>
              <input
                type="number"
                min="0"
                max="127"
                value={data2}
                onChange={(e) => setData2(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={disabled}
              />
            </div>
          </div>
        )}

        {messageType === 'program' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Program Number (0-127)
            </label>
            <input
              type="number"
              min="0"
              max="127"
              value={programNumber}
              onChange={(e) => setProgramNumber(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={disabled}
            />
            <p className="text-xs text-gray-500 mt-1">Changes instrument/patch</p>
          </div>
        )}

        {messageType === 'pitchBend' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Pitch Bend Value (0-16383)
            </label>
            <input
              type="number"
              min="0"
              max="16383"
              value={pitchBendValue}
              onChange={(e) => setPitchBendValue(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={disabled}
            />
            <p className="text-xs text-gray-500 mt-1">8192 = Center (no bend)</p>
          </div>
        )}

        {messageType === 'sysex' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              SysEx Data (Hex, space-separated)
            </label>
            <textarea
              value={sysexData}
              onChange={(e) => setSysexData(e.target.value)}
              placeholder="F0 7F 7F 04 01 00 7F F7"
              rows={3}
              className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:border-blue-500 resize-none ${
                validateSysEx(sysexData) ? 'focus:ring-blue-500' : 'focus:ring-red-500 border-red-600'
              }`}
              disabled={disabled}
            />
            <p className="text-xs text-gray-500 mt-1">
              Must start with F0 and end with F7
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSendMessage}
            disabled={disabled || isLoading || (messageType === 'sysex' && !validateSysEx(sysexData))}
            className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send Message
          </button>

          {messageType === 'note' && (
            <button
              onClick={handleSendNoteSequence}
              disabled={disabled || isLoading}
              className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send Scale
            </button>
          )}

          {messageType === 'cc' && (
            <button
              onClick={handleSendCCRamp}
              disabled={disabled || isLoading}
              className="px-4 py-2 text-sm font-semibold text-white bg-orange-600 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send Ramp
            </button>
          )}
        </div>

        {/* Message Type Info */}
        <div className="text-xs text-gray-500">
          {messageType === 'note' && 'Send Note On/Off messages'}
          {messageType === 'cc' && 'Send Control Change messages'}
          {messageType === 'program' && 'Send Program Change messages'}
          {messageType === 'pitchBend' && 'Send Pitch Bend messages'}
          {messageType === 'aftertouch' && 'Send Channel Aftertouch messages'}
          {messageType === 'sysex' && 'Send System Exclusive messages'}
          {messageType === 'clock' && 'Send MIDI Clock messages'}
        </div>
      </div>
    </div>
  );
};

export default AdvancedMidiSender;