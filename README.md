# BLE MIDI Central Simulator

A web-based simulator for a BLE MIDI Central device to send and receive BLE MIDI messages directly from your browser. It supports both standard 7-bit and high-resolution 14-bit Control Change (CC) messages, providing a flexible interface for testing and interacting with BLE MIDI peripheral devices.

## Features

- **Web Bluetooth Connectivity**: Connect to any BLE MIDI peripheral directly from a supported browser.
- **Standard & High-Res CC**: Send both 7-bit (0-127) and 14-bit (0-16383) CC messages.
- **Customizable Descriptions**: Add a custom label to each sender card to easily identify its purpose.
- **Live MIDI Log**: View incoming MIDI messages in real-time and clear the log when needed.
- **Dynamic Interface**: Add, remove, and reorder MIDI sender cards via drag-and-drop.
- **Responsive Design**: Usable on both desktop and mobile devices.

## Prerequisites

To use this application, you need a modern web browser that supports the **Web Bluetooth API**. As of now, this includes:
- Google Chrome (Desktop and Android)
- Microsoft Edge (Desktop)
- Opera (Desktop and Android)

## How to Use

### 1. Connecting to a BLE MIDI Device

Before you can send or receive messages, you must connect to your BLE MIDI device.

1.  **Power On Your Device**: Make sure your BLE MIDI device is turned on and discoverable.
2.  **Click Connect**: Press the **Connect** button. Your browser will open a device selection dialog box, showing a list of available Bluetooth devices.
3.  **Select and Pair**: Find your MIDI device in the list, select it, and click "Pair".
4.  **Confirm Connection**: Once connected, the status indicator in the top bar will turn green, and the text will show `Connected to: [Your Device Name]`. The sender cards will become active.

### 2. Sending MIDI Messages

The application provides two types of "sender" cards for sending Control Change (CC) messages. You can add a custom description to each card to remember what it's for (e.g., "Main Volume," "Filter Cutoff").

-   **Standard CC (7-bit)**: For standard MIDI messages with a value range of 0-127.
    -   **CC Number**: Set the Control Change number you want to send (e.g., `7` for Volume, `1` for Modulation).
    -   **Value**: Drag the slider to set the value. The MIDI message is sent automatically when you release the slider.

-   **High-Res CC (14-bit)**: For high-resolution messages that combine two CC numbers (an MSB and LSB pair) for a much larger value range of 0-16383.
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
-   Click the **"Clear Log"** button to empty the message history.
-   This is useful for debugging and confirming that your device is sending data as expected.

### 5. Disconnecting

When you are finished, simply click the **Disconnect** button. This will close the connection to the device, and the status indicator will return to "Disconnected".
