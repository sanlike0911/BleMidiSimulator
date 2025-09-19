import React, { useState, useCallback, useEffect } from 'react';
import { BluetoothMode } from '../../shared/types';

interface DevicePreset {
  id: string;
  name: string;
  mode: BluetoothMode;
  deviceName?: string; // For peripheral mode
  autoConnect?: boolean; // For central mode
  midiMapping?: {
    type: 'note' | 'cc' | 'program';
    channel: number;
    value?: number;
  }[];
  created: Date;
  lastUsed?: Date;
}

interface DevicePresetsProps {
  currentMode: BluetoothMode;
  onApplyPreset: (preset: DevicePreset) => Promise<void>;
  onSwitchMode: (mode: BluetoothMode) => Promise<void>;
}

const DEFAULT_PRESETS: DevicePreset[] = [
  {
    id: 'central-default',
    name: 'Central Mode - Default',
    mode: 'central',
    autoConnect: true,
    midiMapping: [
      { type: 'note', channel: 1 },
      { type: 'cc', channel: 1, value: 7 }, // Volume
      { type: 'cc', channel: 1, value: 1 }, // Modulation
    ],
    created: new Date('2024-01-01')
  },
  {
    id: 'peripheral-default',
    name: 'Peripheral Mode - Default',
    mode: 'peripheral',
    deviceName: 'BLE MIDI Simulator',
    midiMapping: [
      { type: 'note', channel: 1 },
      { type: 'cc', channel: 1, value: 7 },
      { type: 'cc', channel: 1, value: 10 }, // Pan
    ],
    created: new Date('2024-01-01')
  },
  {
    id: 'drum-machine',
    name: 'Drum Machine Controller',
    mode: 'central',
    autoConnect: true,
    midiMapping: [
      { type: 'note', channel: 10 }, // Drum channel
      { type: 'cc', channel: 10, value: 7 }, // Volume
    ],
    created: new Date('2024-01-01')
  },
  {
    id: 'synthesizer',
    name: 'Synthesizer Interface',
    mode: 'peripheral',
    deviceName: 'BLE Synthesizer',
    midiMapping: [
      { type: 'note', channel: 1 },
      { type: 'cc', channel: 1, value: 1 }, // Modulation
      { type: 'cc', channel: 1, value: 7 }, // Volume
      { type: 'cc', channel: 1, value: 10 }, // Pan
      { type: 'cc', channel: 1, value: 74 }, // Filter Cutoff
    ],
    created: new Date('2024-01-01')
  }
];

const DevicePresets: React.FC<DevicePresetsProps> = ({
  currentMode,
  onApplyPreset,
  onSwitchMode
}) => {
  const [presets, setPresets] = useState<DevicePreset[]>([]);
  const [isCreatingPreset, setIsCreatingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetMode, setNewPresetMode] = useState<BluetoothMode>(currentMode);
  const [newPresetDeviceName, setNewPresetDeviceName] = useState('BLE MIDI Simulator');

  // Load presets from localStorage
  useEffect(() => {
    try {
      const savedPresets = localStorage.getItem('bleMidiPresets');
      if (savedPresets) {
        const parsed = JSON.parse(savedPresets);
        setPresets([...DEFAULT_PRESETS, ...parsed]);
      } else {
        setPresets(DEFAULT_PRESETS);
      }
    } catch (error) {
      console.error('Failed to load presets:', error);
      setPresets(DEFAULT_PRESETS);
    }
  }, []);

  // Save presets to localStorage
  const savePresets = useCallback((updatedPresets: DevicePreset[]) => {
    try {
      const customPresets = updatedPresets.filter(p => !DEFAULT_PRESETS.find(dp => dp.id === p.id));
      localStorage.setItem('bleMidiPresets', JSON.stringify(customPresets));
      setPresets(updatedPresets);
    } catch (error) {
      console.error('Failed to save presets:', error);
    }
  }, []);

  const handleApplyPreset = useCallback(async (preset: DevicePreset) => {
    try {
      // Switch mode if necessary
      if (preset.mode !== currentMode) {
        await onSwitchMode(preset.mode);
        // Small delay to allow mode switch to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Update last used timestamp
      const updatedPresets = presets.map(p =>
        p.id === preset.id ? { ...p, lastUsed: new Date() } : p
      );
      savePresets(updatedPresets);

      // Apply the preset
      await onApplyPreset(preset);

      console.log(`Applied preset: ${preset.name}`);
    } catch (error) {
      console.error('Failed to apply preset:', error);
    }
  }, [currentMode, onSwitchMode, onApplyPreset, presets, savePresets]);

  const handleCreatePreset = useCallback(() => {
    if (!newPresetName.trim()) return;

    const newPreset: DevicePreset = {
      id: `custom-${Date.now()}`,
      name: newPresetName.trim(),
      mode: newPresetMode,
      deviceName: newPresetMode === 'peripheral' ? newPresetDeviceName : undefined,
      autoConnect: newPresetMode === 'central',
      midiMapping: [
        { type: 'note', channel: 1 },
        { type: 'cc', channel: 1, value: 7 }
      ],
      created: new Date()
    };

    const updatedPresets = [...presets, newPreset];
    savePresets(updatedPresets);

    // Reset form
    setNewPresetName('');
    setNewPresetDeviceName('BLE MIDI Simulator');
    setIsCreatingPreset(false);
  }, [newPresetName, newPresetMode, newPresetDeviceName, presets, savePresets]);

  const handleDeletePreset = useCallback((presetId: string) => {
    // Don't allow deletion of default presets
    if (DEFAULT_PRESETS.find(p => p.id === presetId)) return;

    const updatedPresets = presets.filter(p => p.id !== presetId);
    savePresets(updatedPresets);
  }, [presets, savePresets]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const getModeColor = (mode: BluetoothMode) => {
    return mode === 'central' ? 'text-blue-400' : 'text-green-400';
  };

  const getModeBgColor = (mode: BluetoothMode) => {
    return mode === 'central' ? 'bg-blue-600' : 'bg-green-600';
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Device Presets</h3>
        <button
          onClick={() => setIsCreatingPreset(true)}
          className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          Create Preset
        </button>
      </div>

      {isCreatingPreset && (
        <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 mb-4">
          <h4 className="text-md font-medium text-white mb-3">Create New Preset</h4>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Preset Name
              </label>
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="Enter preset name"
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Mode
              </label>
              <select
                value={newPresetMode}
                onChange={(e) => setNewPresetMode(e.target.value as BluetoothMode)}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="central">Central Mode</option>
                <option value="peripheral">Peripheral Mode</option>
              </select>
            </div>

            {newPresetMode === 'peripheral' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Device Name
                </label>
                <input
                  type="text"
                  value={newPresetDeviceName}
                  onChange={(e) => setNewPresetDeviceName(e.target.value)}
                  placeholder="Device name for advertising"
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleCreatePreset}
                disabled={!newPresetName.trim()}
                className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-700 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => setIsCreatingPreset(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-700 focus:ring-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {presets.map(preset => (
          <div
            key={preset.id}
            className="bg-gray-700 border border-gray-600 rounded-lg p-3 hover:bg-gray-650 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="text-white font-medium">{preset.name}</h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getModeBgColor(preset.mode)} text-white`}>
                    {preset.mode.toUpperCase()}
                  </span>
                  {preset.mode === currentMode && (
                    <span className="text-xs text-green-400">●</span>
                  )}
                </div>

                <div className="text-sm text-gray-400 mt-1">
                  {preset.mode === 'peripheral' && preset.deviceName && (
                    <span>Device: {preset.deviceName} • </span>
                  )}
                  <span>Created: {formatDate(preset.created)}</span>
                  {preset.lastUsed && (
                    <span> • Last used: {formatDate(preset.lastUsed)}</span>
                  )}
                </div>

                {preset.midiMapping && (
                  <div className="text-xs text-gray-500 mt-1">
                    MIDI: {preset.midiMapping.map(m => `${m.type}(ch${m.channel})`).join(', ')}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleApplyPreset(preset)}
                  className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                >
                  Apply
                </button>

                {!DEFAULT_PRESETS.find(p => p.id === preset.id) && (
                  <button
                    onClick={() => handleDeletePreset(preset.id)}
                    className="px-2 py-1 text-sm text-red-400 hover:text-red-300 transition-colors"
                    title="Delete preset"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {presets.length === 0 && (
        <div className="text-center py-6 text-gray-400">
          <p>No presets available. Create your first preset!</p>
        </div>
      )}
    </div>
  );
};

export default DevicePresets;