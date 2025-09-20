import {
  MidiMessage,
  ParsedMidiMessage,
  NoteOnMessage,
  NoteOffMessage,
  ControlChangeMessage,
  ProgramChangeMessage,
  PitchBendMessage,
  AftertouchMessage,
  PolyphonicAftertouchMessage,
  SystemExclusiveMessage,
  BleMidiPacket
} from '../../types/midi';
import { MIDI_MESSAGE_TYPES, BLE_MIDI } from '../../constants/midi';

export class MidiParser {
  private runningStatus: number = 0;

  /**
   * Parse BLE MIDI packet and extract MIDI messages
   */
  public parseBleMidiPacket(data: ArrayBuffer): ParsedMidiMessage[] {
    const bytes = new Uint8Array(data);
    const messages: ParsedMidiMessage[] = [];

    if (bytes.length < 2) {
      return messages;
    }

    let index = 0;

    // Skip BLE MIDI header byte
    if (bytes[0] & BLE_MIDI.HEADER_BYTE) {
      index = 1;
    }

    // Parse timestamp (if present)
    let timestamp = Date.now();
    if (index < bytes.length && (bytes[index] & BLE_MIDI.TIMESTAMP_MSB_MASK)) {
      // High byte of timestamp
      const timestampHigh = bytes[index] & BLE_MIDI.TIMESTAMP_MASK;
      index++;

      if (index < bytes.length && !(bytes[index] & BLE_MIDI.TIMESTAMP_MSB_MASK)) {
        // Low byte of timestamp
        const timestampLow = bytes[index] & BLE_MIDI.TIMESTAMP_MASK;
        timestamp = (timestampHigh << 7) | timestampLow;
        index++;
      }
    }

    // Parse MIDI messages
    while (index < bytes.length) {
      const message = this.parseMidiMessage(bytes, index, timestamp);
      if (message.parsedMessage) {
        messages.push(message.parsedMessage);
      }
      index = message.nextIndex;
    }

    return messages;
  }

  /**
   * Parse a single MIDI message from byte array
   */
  private parseMidiMessage(bytes: Uint8Array, startIndex: number, timestamp: number): { parsedMessage: ParsedMidiMessage | null; nextIndex: number } {
    let index = startIndex;

    if (index >= bytes.length) {
      return { parsedMessage: null, nextIndex: index };
    }

    let statusByte = bytes[index];

    // Handle running status
    if (statusByte < 0x80) {
      statusByte = this.runningStatus;
      // Don't increment index for running status
    } else {
      this.runningStatus = statusByte;
      index++;
    }

    const messageType = statusByte & 0xf0;
    const channel = statusByte & 0x0f;

    try {
      switch (messageType) {
        case MIDI_MESSAGE_TYPES.NOTE_OFF:
          return this.parseNoteOff(bytes, index, channel, timestamp);

        case MIDI_MESSAGE_TYPES.NOTE_ON:
          return this.parseNoteOn(bytes, index, channel, timestamp);

        case MIDI_MESSAGE_TYPES.POLYPHONIC_AFTERTOUCH:
          return this.parsePolyphonicAftertouch(bytes, index, channel, timestamp);

        case MIDI_MESSAGE_TYPES.CONTROL_CHANGE:
          return this.parseControlChange(bytes, index, channel, timestamp);

        case MIDI_MESSAGE_TYPES.PROGRAM_CHANGE:
          return this.parseProgramChange(bytes, index, channel, timestamp);

        case MIDI_MESSAGE_TYPES.CHANNEL_AFTERTOUCH:
          return this.parseChannelAftertouch(bytes, index, channel, timestamp);

        case MIDI_MESSAGE_TYPES.PITCH_BEND:
          return this.parsePitchBend(bytes, index, channel, timestamp);

        case MIDI_MESSAGE_TYPES.SYSTEM_EXCLUSIVE:
          return this.parseSystemExclusive(bytes, index, channel, timestamp);

        default:
          console.warn(`Unknown MIDI message type: 0x${messageType.toString(16)}`);
          return { parsedMessage: null, nextIndex: index + 1 };
      }
    } catch (error) {
      console.error('Error parsing MIDI message:', error);
      return { parsedMessage: null, nextIndex: index + 1 };
    }
  }

  private parseNoteOff(bytes: Uint8Array, index: number, channel: number, timestamp: number): { parsedMessage: NoteOffMessage | null; nextIndex: number } {
    if (index + 1 >= bytes.length) {
      return { parsedMessage: null, nextIndex: index };
    }

    const note = bytes[index] & 0x7f;
    const velocity = bytes[index + 1] & 0x7f;

    const message: NoteOffMessage = {
      type: 'noteOff',
      channel,
      timestamp,
      note,
      velocity,
      data: new Uint8Array([MIDI_MESSAGE_TYPES.NOTE_OFF | channel, note, velocity])
    };

    return { parsedMessage: message, nextIndex: index + 2 };
  }

  private parseNoteOn(bytes: Uint8Array, index: number, channel: number, timestamp: number): { parsedMessage: NoteOnMessage | NoteOffMessage | null; nextIndex: number } {
    if (index + 1 >= bytes.length) {
      return { parsedMessage: null, nextIndex: index };
    }

    const note = bytes[index] & 0x7f;
    const velocity = bytes[index + 1] & 0x7f;

    // Note On with velocity 0 is equivalent to Note Off
    if (velocity === 0) {
      const message: NoteOffMessage = {
        type: 'noteOff',
        channel,
        timestamp,
        note,
        velocity,
        data: new Uint8Array([MIDI_MESSAGE_TYPES.NOTE_OFF | channel, note, velocity])
      };
      return { parsedMessage: message, nextIndex: index + 2 };
    }

    const message: NoteOnMessage = {
      type: 'noteOn',
      channel,
      timestamp,
      note,
      velocity,
      data: new Uint8Array([MIDI_MESSAGE_TYPES.NOTE_ON | channel, note, velocity])
    };

    return { parsedMessage: message, nextIndex: index + 2 };
  }

  private parseControlChange(bytes: Uint8Array, index: number, channel: number, timestamp: number): { parsedMessage: ControlChangeMessage | null; nextIndex: number } {
    if (index + 1 >= bytes.length) {
      return { parsedMessage: null, nextIndex: index };
    }

    const controller = bytes[index] & 0x7f;
    const value = bytes[index + 1] & 0x7f;

    const message: ControlChangeMessage = {
      type: 'controlChange',
      channel,
      timestamp,
      controller,
      value,
      data: new Uint8Array([MIDI_MESSAGE_TYPES.CONTROL_CHANGE | channel, controller, value])
    };

    return { parsedMessage: message, nextIndex: index + 2 };
  }

  private parseProgramChange(bytes: Uint8Array, index: number, channel: number, timestamp: number): { parsedMessage: ProgramChangeMessage | null; nextIndex: number } {
    if (index >= bytes.length) {
      return { parsedMessage: null, nextIndex: index };
    }

    const program = bytes[index] & 0x7f;

    const message: ProgramChangeMessage = {
      type: 'programChange',
      channel,
      timestamp,
      program,
      data: new Uint8Array([MIDI_MESSAGE_TYPES.PROGRAM_CHANGE | channel, program])
    };

    return { parsedMessage: message, nextIndex: index + 1 };
  }

  private parsePitchBend(bytes: Uint8Array, index: number, channel: number, timestamp: number): { parsedMessage: PitchBendMessage | null; nextIndex: number } {
    if (index + 1 >= bytes.length) {
      return { parsedMessage: null, nextIndex: index };
    }

    const lsb = bytes[index] & 0x7f;
    const msb = bytes[index + 1] & 0x7f;
    const value = (msb << 7) | lsb;

    const message: PitchBendMessage = {
      type: 'pitchBend',
      channel,
      timestamp,
      value,
      data: new Uint8Array([MIDI_MESSAGE_TYPES.PITCH_BEND | channel, lsb, msb])
    };

    return { parsedMessage: message, nextIndex: index + 2 };
  }

  private parseChannelAftertouch(bytes: Uint8Array, index: number, channel: number, timestamp: number): { parsedMessage: AftertouchMessage | null; nextIndex: number } {
    if (index >= bytes.length) {
      return { parsedMessage: null, nextIndex: index };
    }

    const pressure = bytes[index] & 0x7f;

    const message: AftertouchMessage = {
      type: 'aftertouch',
      channel,
      timestamp,
      pressure,
      data: new Uint8Array([MIDI_MESSAGE_TYPES.CHANNEL_AFTERTOUCH | channel, pressure])
    };

    return { parsedMessage: message, nextIndex: index + 1 };
  }

  private parsePolyphonicAftertouch(bytes: Uint8Array, index: number, channel: number, timestamp: number): { parsedMessage: PolyphonicAftertouchMessage | null; nextIndex: number } {
    if (index + 1 >= bytes.length) {
      return { parsedMessage: null, nextIndex: index };
    }

    const note = bytes[index] & 0x7f;
    const pressure = bytes[index + 1] & 0x7f;

    const message: PolyphonicAftertouchMessage = {
      type: 'polyphonicAftertouch',
      channel,
      timestamp,
      note,
      pressure,
      data: new Uint8Array([MIDI_MESSAGE_TYPES.POLYPHONIC_AFTERTOUCH | channel, note, pressure])
    };

    return { parsedMessage: message, nextIndex: index + 2 };
  }

  private parseSystemExclusive(bytes: Uint8Array, index: number, channel: number, timestamp: number): { parsedMessage: SystemExclusiveMessage | null; nextIndex: number } {
    // Find end of SysEx (0xF7)
    let endIndex = index;
    while (endIndex < bytes.length && bytes[endIndex] !== 0xf7) {
      endIndex++;
    }

    if (endIndex >= bytes.length) {
      // Incomplete SysEx message
      return { parsedMessage: null, nextIndex: bytes.length };
    }

    // Include the 0xF7 end byte
    endIndex++;

    const sysExData = bytes.slice(index, endIndex);
    const manufacturerId: number[] = [];

    // Extract manufacturer ID (first 1-3 bytes after 0xF0)
    if (sysExData.length > 1) {
      if (sysExData[1] === 0x00) {
        // 3-byte manufacturer ID
        if (sysExData.length > 3) {
          manufacturerId.push(sysExData[1], sysExData[2], sysExData[3]);
        }
      } else {
        // 1-byte manufacturer ID
        manufacturerId.push(sysExData[1]);
      }
    }

    const message: SystemExclusiveMessage = {
      type: 'systemExclusive',
      channel,
      timestamp,
      manufacturerId,
      data: sysExData,
    };

    return { parsedMessage: message, nextIndex: endIndex };
  }

  /**
   * Convert parsed MIDI message back to raw bytes
   */
  public messageToBytes(message: ParsedMidiMessage): Uint8Array {
    return message.data;
  }

  /**
   * Create a BLE MIDI packet from MIDI messages
   */
  public createBleMidiPacket(messages: ParsedMidiMessage[], timestamp?: number): Uint8Array {
    const packets: number[] = [];

    // Add BLE MIDI header
    packets.push(BLE_MIDI.HEADER_BYTE);

    // Add timestamp if provided
    if (timestamp !== undefined) {
      const timestampHigh = ((timestamp >> 7) & BLE_MIDI.TIMESTAMP_MASK) | BLE_MIDI.TIMESTAMP_MSB_MASK;
      const timestampLow = timestamp & BLE_MIDI.TIMESTAMP_MASK;
      packets.push(timestampHigh, timestampLow);
    }

    // Add MIDI messages
    for (const message of messages) {
      const bytes = this.messageToBytes(message);
      packets.push(...Array.from(bytes));
    }

    return new Uint8Array(packets);
  }

  /**
   * Reset parser state
   */
  public reset(): void {
    this.runningStatus = 0;
  }
}