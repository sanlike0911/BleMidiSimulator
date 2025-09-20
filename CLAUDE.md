# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev`
- **Build for production**: `npm run build`
- **Preview production build**: `npm run preview`

## Project Architecture

This is a React + TypeScript web application built with Vite that implements a BLE MIDI simulator. The app allows users to connect to Bluetooth Low Energy MIDI devices directly from the browser and send/receive MIDI messages.

### Core Architecture

**Main Components:**
- `App.tsx` - Root component managing BLE connection state, MIDI message handling, and drag-and-drop functionality for sender cards
- `types.ts` - TypeScript definitions for MIDI device state and parsed MIDI messages

**Component Structure:**
- `components/ConnectionManager.tsx` - Handles BLE device discovery, connection, and disconnection
- `components/StandardCCSender.tsx` - 7-bit Control Change message sender (0-127 range)
- `components/HighResCCSender.tsx` - 14-bit Control Change message sender (0-16383 range)
- `components/MidiLog.tsx` - Real-time display of received MIDI messages
- `components/Card.tsx` - Base drag-and-drop card component

### Key Technical Details

**BLE MIDI Protocol:**
- Service UUID: `03b80e5a-ede8-4b33-a751-6ce34ec4c700`
- Characteristic UUID: `7772e5db-3868-4112-a1a9-f2669d106bf3`
- Outgoing messages include BLE MIDI timestamp headers (performance-based timing)
- Incoming messages are parsed for Note On/Off and Control Change types

**Web Bluetooth API Usage:**
- Uses experimental Web Bluetooth API (requires HTTPS and compatible browsers)
- Type definitions are cast to `any` due to limited TypeScript support for Web Bluetooth
- Device filtering supports name prefix matching

**State Management:**
- React hooks for connection state, received messages, and dynamic sender components
- Drag-and-drop reordering of MIDI sender cards
- Real-time MIDI message parsing and logging (limited to last 100 messages)

**High-Resolution CC Implementation:**
- MSB CC numbers 0-31 paired with LSB CC numbers 32-63
- 14-bit values split into MSB (upper 7 bits) and LSB (lower 7 bits)
- Sends two separate MIDI messages per high-res control change

### Browser Compatibility

Requires Web Bluetooth API support:
- Chrome (Desktop/Android)
- Edge (Desktop)
- Opera (Desktop/Android)
- Safari and Firefox do not support Web Bluetooth

### Configuration Notes

- Vite config includes path alias `@/*` for root-relative imports
- Environment variables setup for potential API keys (currently unused for core functionality)
- TypeScript configured for React JSX and modern ES2022 features

## Documentation

### Design Documents (`docs/*`)

- `docs/electron-migration-design.md` - Design document for migrating to Electron desktop application
- `docs/electron-implementation-plan.md` - Implementation plan and instructions for Electron integration