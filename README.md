# BLE MIDI Simulator - React Native

A cross-platform React Native application to send and receive BLE MIDI messages on iOS, Android, and future Windows/Mac support. This app supports both standard 7-bit and high-resolution 14-bit Control Change (CC) messages, providing a flexible interface for testing and interacting with BLE MIDI devices.

**🚀 Status**: Currently migrated from Web version to React Native. Supports BLE Central mode with BLE Peripheral mode coming in future phases.

## Features

- **Cross-Platform BLE Connectivity**: Connect to any BLE MIDI device from iOS and Android devices.
- **Device Name Filtering**: Easily find your device by filtering the scan list by name.
- **Standard & High-Res CC**: Send both 7-bit (0-127) and 14-bit (0-16383) CC messages.
- **Live MIDI Log**: View incoming MIDI messages in real-time.
- **Dynamic Interface**: Add, remove, and reorder MIDI sender cards via drag-and-drop.
- **Native Performance**: Optimized for mobile devices with low-latency MIDI communication.

## Prerequisites

- **iOS**: iOS 10.0+ with Bluetooth LE support
- **Android**: Android 5.0+ (API 21+) with Bluetooth LE support
- **Development**: React Native development environment set up
- **Physical Device**: BLE functionality requires real device (not simulator/emulator)

## Getting Started

### Development Setup

1. **Set up React Native environment**: Follow the [React Native CLI Quickstart](https://reactnative.dev/docs/environment-setup) guide
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **iOS Setup**:
   ```bash
   cd ios && pod install && cd ..
   ```
4. **Run the app**:
   ```bash
   # For iOS
   npm run ios

   # For Android
   npm run android
   ```

### How to Use

#### 1. Connecting to a BLE MIDI Device

1.  **Enable Bluetooth**: Make sure Bluetooth is enabled on your mobile device
2.  **Power On Your Device**: Make sure your BLE MIDI device is turned on and discoverable
3.  **(Optional) Filter by Name**: Type part of your device name to filter the scan results
4.  **Tap Scan**: Press the **Scan** button to discover nearby BLE MIDI devices
5.  **Select Device**: Tap on your device from the list to connect
6.  **Confirm Connection**: The status indicator will show "Connected" and display your device name

### 2. Sending MIDI Messages

The application provides two types of "sender" cards for sending Control Change (CC) messages.

-   **Standard CC (7-bit)**: For standard MIDI messages with a value range of 0-127.
    -   **CC Number**: Set the Control Change number you want to send (e.g., `7` for Volume, `1` for Modulation).
    -   **Value**: Drag the slider to set the value. The MIDI message is sent automatically when you release the slider.

-   **High-Resolution CC (14-bit)**: For high-resolution messages that combine two CC numbers (an MSB and LSB pair) for a much larger value range of 0-16383.
    -   **MSB CC (0-31)**: Set the Most Significant Bit CC number. The corresponding LSB (Least Significant Bit) number is automatically set to `MSB + 32`.
    -   **Value**: Drag the slider to set the 14-bit value. Two MIDI messages (one for MSB, one for LSB) are sent when you release the slider.

### 3. Managing Sender Cards

You can customize your workspace by adding, removing, and reordering sender cards.

-   **Add a Sender**: Click the **"Add Standard CC"** or **"Add High-Res CC"** buttons to add new sender cards to the grid.
-   **Remove a Sender**: Click the **'X'** icon in the top-right corner of any card to remove it.
-   **Reorder Senders**: Click and hold on a sender card, then drag it to a new position in the grid and release. This allows you to organize your controls as needed.

### 4. Receiving MIDI Messages

The **"Received MIDI Messages"** log at the bottom of the page displays all incoming data from your connected device.

-   Each message is timestamped.
-   The log decodes common messages like Note On, Note Off, and Control Change, showing the channel, CC number, and value.
-   This is useful for debugging and confirming that your device is sending data as expected.

### 5. Disconnecting

When you are finished, simply click the **Disconnect** button. This will close the connection to the device, and the status indicator will return to "Disconnected".

## Documentation

The `docs/` directory contains comprehensive documentation for the React Native migration and expansion project:

- **[React Native Migration Design](docs/react-native-migration-design.md)** - Technical architecture and design specifications for migrating to React Native with cross-platform support (Windows, Mac, Android)
- **[Implementation Plan](docs/implementation-plan.md)** - Detailed 12-week roadmap for implementing React Native migration and adding BLE peripheral functionality

These documents provide the complete blueprint for transforming this web-based BLE MIDI central simulator into a full-featured cross-platform BLE MIDI simulator supporting both central and peripheral modes.
