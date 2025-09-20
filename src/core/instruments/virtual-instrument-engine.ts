import {
  VirtualInstrument,
  InstrumentType,
  InstrumentParameter,
  NoteEvent,
  ControlEvent
} from '../../types/peripheral';
import { ParsedMidiMessage } from '../../types/midi';

export interface VirtualInstrumentEngineOptions {
  maxInstruments?: number;
  enableSequencer?: boolean;
  enableArpeggiator?: boolean;
  defaultChannel?: number;
}

export interface VirtualInstrumentEngineEvents {
  instrumentAdded: (instrument: VirtualInstrument) => void;
  instrumentRemoved: (instrumentId: string) => void;
  instrumentActivated: (instrumentId: string) => void;
  instrumentDeactivated: (instrumentId: string) => void;
  parameterChanged: (instrumentId: string, parameterId: string, value: number) => void;
  noteTriggered: (instrumentId: string, event: NoteEvent) => void;
  controlTriggered: (instrumentId: string, event: ControlEvent) => void;
  midiGenerated: (instrumentId: string, message: ParsedMidiMessage) => void;
}

export class VirtualInstrumentEngine {
  private instruments: Map<string, VirtualInstrument> = new Map();
  private eventListeners: Partial<VirtualInstrumentEngineEvents> = {};
  private options: Required<VirtualInstrumentEngineOptions>;
  private nextInstrumentId: number = 1;

  constructor(options?: VirtualInstrumentEngineOptions) {
    this.options = {
      maxInstruments: options?.maxInstruments || 16,
      enableSequencer: options?.enableSequencer || true,
      enableArpeggiator: options?.enableArpeggiator || true,
      defaultChannel: options?.defaultChannel || 0,
    };

    this.initializeDefaultInstruments();
  }

  public on<K extends keyof VirtualInstrumentEngineEvents>(event: K, listener: VirtualInstrumentEngineEvents[K]): void {
    this.eventListeners[event] = listener;
  }

  public off<K extends keyof VirtualInstrumentEngineEvents>(event: K): void {
    delete this.eventListeners[event];
  }

  private initializeDefaultInstruments(): void {
    // Add default virtual piano
    this.addInstrument({
      id: 'piano-1',
      name: 'Virtual Piano',
      type: 'piano',
      channel: 0,
      isActive: true,
      parameters: [
        { id: 'volume', name: 'Volume', type: 'slider', value: 100, min: 0, max: 127, midiController: 7 },
        { id: 'sustain', name: 'Sustain', type: 'toggle', value: 0, min: 0, max: 1, midiController: 64 },
        { id: 'attack', name: 'Attack', type: 'knob', value: 64, min: 0, max: 127, midiController: 73 },
        { id: 'release', name: 'Release', type: 'knob', value: 64, min: 0, max: 127, midiController: 72 }
      ]
    });

    // Add MIDI controller
    this.addInstrument({
      id: 'controller-1',
      name: 'MIDI Controller',
      type: 'controller',
      channel: 0,
      isActive: true,
      parameters: [
        { id: 'cc1', name: 'Modulation', type: 'slider', value: 0, min: 0, max: 127, midiController: 1 },
        { id: 'cc2', name: 'Breath', type: 'slider', value: 0, min: 0, max: 127, midiController: 2 },
        { id: 'cc11', name: 'Expression', type: 'slider', value: 127, min: 0, max: 127, midiController: 11 },
        { id: 'cc74', name: 'Cutoff', type: 'knob', value: 64, min: 0, max: 127, midiController: 74 },
        { id: 'cc71', name: 'Resonance', type: 'knob', value: 64, min: 0, max: 127, midiController: 71 }
      ]
    });

    // Add drum kit
    this.addInstrument({
      id: 'drums-1',
      name: 'Drum Kit',
      type: 'drumKit',
      channel: 9, // Standard MIDI drum channel
      isActive: true,
      parameters: [
        { id: 'volume', name: 'Volume', type: 'slider', value: 100, min: 0, max: 127, midiController: 7 },
        { id: 'reverb', name: 'Reverb', type: 'knob', value: 40, min: 0, max: 127, midiController: 91 },
        { id: 'chorus', name: 'Chorus', type: 'knob', value: 0, min: 0, max: 127, midiController: 93 }
      ]
    });

    if (this.options.enableArpeggiator) {
      this.addInstrument({
        id: 'arp-1',
        name: 'Arpeggiator',
        type: 'arpeggiator',
        channel: 1,
        isActive: false,
        parameters: [
          { id: 'rate', name: 'Rate', type: 'knob', value: 120, min: 60, max: 200 },
          { id: 'pattern', name: 'Pattern', type: 'select', value: 0, min: 0, max: 7 },
          { id: 'octaves', name: 'Octaves', type: 'select', value: 1, min: 1, max: 4 },
          { id: 'gate', name: 'Gate', type: 'knob', value: 80, min: 10, max: 100 }
        ]
      });
    }
  }

  public addInstrument(instrument: VirtualInstrument): void {
    if (this.instruments.size >= this.options.maxInstruments) {
      throw new Error(`Maximum number of instruments (${this.options.maxInstruments}) reached`);
    }

    if (this.instruments.has(instrument.id)) {
      throw new Error(`Instrument with ID ${instrument.id} already exists`);
    }

    this.instruments.set(instrument.id, { ...instrument });
    this.eventListeners.instrumentAdded?.(instrument);
    console.log(`Added virtual instrument: ${instrument.name} (${instrument.id})`);
  }

  public removeInstrument(instrumentId: string): void {
    const instrument = this.instruments.get(instrumentId);
    if (!instrument) {
      console.warn(`Instrument ${instrumentId} not found`);
      return;
    }

    this.instruments.delete(instrumentId);
    this.eventListeners.instrumentRemoved?.(instrumentId);
    console.log(`Removed virtual instrument: ${instrumentId}`);
  }

  public getInstrument(instrumentId: string): VirtualInstrument | undefined {
    return this.instruments.get(instrumentId);
  }

  public getInstruments(): VirtualInstrument[] {
    return Array.from(this.instruments.values());
  }

  public getActiveInstruments(): VirtualInstrument[] {
    return this.getInstruments().filter(inst => inst.isActive);
  }

  public getInstrumentsByType(type: InstrumentType): VirtualInstrument[] {
    return this.getInstruments().filter(inst => inst.type === type);
  }

  public activateInstrument(instrumentId: string): void {
    const instrument = this.instruments.get(instrumentId);
    if (!instrument) {
      throw new Error(`Instrument ${instrumentId} not found`);
    }

    instrument.isActive = true;
    this.eventListeners.instrumentActivated?.(instrumentId);
    console.log(`Activated instrument: ${instrumentId}`);
  }

  public deactivateInstrument(instrumentId: string): void {
    const instrument = this.instruments.get(instrumentId);
    if (!instrument) {
      throw new Error(`Instrument ${instrumentId} not found`);
    }

    instrument.isActive = false;
    this.eventListeners.instrumentDeactivated?.(instrumentId);
    console.log(`Deactivated instrument: ${instrumentId}`);
  }

  public setParameter(instrumentId: string, parameterId: string, value: number): void {
    const instrument = this.instruments.get(instrumentId);
    if (!instrument) {
      throw new Error(`Instrument ${instrumentId} not found`);
    }

    const parameter = instrument.parameters.find(p => p.id === parameterId);
    if (!parameter) {
      throw new Error(`Parameter ${parameterId} not found in instrument ${instrumentId}`);
    }

    // Clamp value to parameter range
    const clampedValue = Math.max(parameter.min, Math.min(parameter.max, value));
    parameter.value = clampedValue;

    this.eventListeners.parameterChanged?.(instrumentId, parameterId, clampedValue);

    // Generate MIDI CC if parameter has MIDI controller mapping
    if (parameter.midiController !== undefined && instrument.isActive) {
      this.generateControlChange(instrument, parameter.midiController, clampedValue);
    }
  }

  public getParameter(instrumentId: string, parameterId: string): number {
    const instrument = this.instruments.get(instrumentId);
    if (!instrument) {
      throw new Error(`Instrument ${instrumentId} not found`);
    }

    const parameter = instrument.parameters.find(p => p.id === parameterId);
    if (!parameter) {
      throw new Error(`Parameter ${parameterId} not found in instrument ${instrumentId}`);
    }

    return parameter.value;
  }

  // Note triggering methods
  public triggerNote(instrumentId: string, note: number, velocity: number, duration?: number): void {
    const instrument = this.instruments.get(instrumentId);
    if (!instrument || !instrument.isActive) {
      return;
    }

    const noteEvent: NoteEvent = {
      note,
      velocity,
      channel: instrument.channel,
      timestamp: Date.now(),
      duration
    };

    this.eventListeners.noteTriggered?.(instrumentId, noteEvent);

    // Generate MIDI Note On
    this.generateNoteOn(instrument, note, velocity);

    // Schedule Note Off if duration is specified
    if (duration) {
      setTimeout(() => {
        this.generateNoteOff(instrument, note, 64);
      }, duration);
    }
  }

  public releaseNote(instrumentId: string, note: number, velocity: number = 64): void {
    const instrument = this.instruments.get(instrumentId);
    if (!instrument || !instrument.isActive) {
      return;
    }

    this.generateNoteOff(instrument, note, velocity);
  }

  public triggerControl(instrumentId: string, controller: number, value: number): void {
    const instrument = this.instruments.get(instrumentId);
    if (!instrument || !instrument.isActive) {
      return;
    }

    const controlEvent: ControlEvent = {
      controller,
      value,
      channel: instrument.channel,
      timestamp: Date.now()
    };

    this.eventListeners.controlTriggered?.(instrumentId, controlEvent);
    this.generateControlChange(instrument, controller, value);
  }

  // MIDI message generation
  private generateNoteOn(instrument: VirtualInstrument, note: number, velocity: number): void {
    const message: ParsedMidiMessage = {
      type: 'noteOn',
      channel: instrument.channel,
      timestamp: Date.now(),
      note,
      velocity,
      data: new Uint8Array([0x90 | instrument.channel, note, velocity])
    };

    this.eventListeners.midiGenerated?.(instrument.id, message);
  }

  private generateNoteOff(instrument: VirtualInstrument, note: number, velocity: number): void {
    const message: ParsedMidiMessage = {
      type: 'noteOff',
      channel: instrument.channel,
      timestamp: Date.now(),
      note,
      velocity,
      data: new Uint8Array([0x80 | instrument.channel, note, velocity])
    };

    this.eventListeners.midiGenerated?.(instrument.id, message);
  }

  private generateControlChange(instrument: VirtualInstrument, controller: number, value: number): void {
    const message: ParsedMidiMessage = {
      type: 'controlChange',
      channel: instrument.channel,
      timestamp: Date.now(),
      controller,
      value,
      data: new Uint8Array([0xb0 | instrument.channel, controller, value])
    };

    this.eventListeners.midiGenerated?.(instrument.id, message);
  }

  // Preset management
  public createPreset(instrumentId: string, name: string): any {
    const instrument = this.instruments.get(instrumentId);
    if (!instrument) {
      throw new Error(`Instrument ${instrumentId} not found`);
    }

    return {
      name,
      instrumentId,
      type: instrument.type,
      channel: instrument.channel,
      parameters: instrument.parameters.map(p => ({
        id: p.id,
        value: p.value
      }))
    };
  }

  public loadPreset(instrumentId: string, preset: any): void {
    const instrument = this.instruments.get(instrumentId);
    if (!instrument) {
      throw new Error(`Instrument ${instrumentId} not found`);
    }

    if (preset.type !== instrument.type) {
      throw new Error(`Preset type ${preset.type} does not match instrument type ${instrument.type}`);
    }

    // Apply preset parameters
    for (const presetParam of preset.parameters) {
      try {
        this.setParameter(instrumentId, presetParam.id, presetParam.value);
      } catch (error) {
        console.warn(`Failed to apply preset parameter ${presetParam.id}:`, error);
      }
    }

    console.log(`Loaded preset "${preset.name}" for instrument ${instrumentId}`);
  }

  // Utility methods
  public resetAllParameters(instrumentId: string): void {
    const instrument = this.instruments.get(instrumentId);
    if (!instrument) {
      throw new Error(`Instrument ${instrumentId} not found`);
    }

    // Reset each parameter to a default value (middle of range for most)
    for (const parameter of instrument.parameters) {
      let defaultValue: number;

      switch (parameter.type) {
        case 'toggle':
          defaultValue = 0;
          break;
        case 'slider':
        case 'knob':
          if (parameter.midiController === 7) { // Volume
            defaultValue = 100;
          } else if (parameter.midiController === 11) { // Expression
            defaultValue = 127;
          } else {
            defaultValue = Math.floor((parameter.min + parameter.max) / 2);
          }
          break;
        default:
          defaultValue = parameter.min;
      }

      this.setParameter(instrumentId, parameter.id, defaultValue);
    }

    console.log(`Reset all parameters for instrument ${instrumentId}`);
  }

  public allNotesOff(instrumentId?: string): void {
    if (instrumentId) {
      const instrument = this.instruments.get(instrumentId);
      if (instrument && instrument.isActive) {
        this.generateControlChange(instrument, 123, 0); // All Notes Off
      }
    } else {
      // All notes off for all active instruments
      for (const instrument of this.getActiveInstruments()) {
        this.generateControlChange(instrument, 123, 0);
      }
    }
  }

  public panic(): void {
    console.log('MIDI Panic: Stopping all notes and sounds');

    for (const instrument of this.getActiveInstruments()) {
      // All Notes Off
      this.generateControlChange(instrument, 123, 0);
      // All Sound Off
      this.generateControlChange(instrument, 120, 0);
    }
  }

  public getNextInstrumentId(): string {
    return `instrument-${this.nextInstrumentId++}`;
  }

  public getInstrumentCount(): number {
    return this.instruments.size;
  }

  public getMaxInstruments(): number {
    return this.options.maxInstruments;
  }

  public canAddMoreInstruments(): boolean {
    return this.instruments.size < this.options.maxInstruments;
  }

  public destroy(): void {
    this.allNotesOff();
    this.instruments.clear();
    this.eventListeners = {};
  }
}