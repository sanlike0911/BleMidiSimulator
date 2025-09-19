# BLE MIDI Simulator - Electron移植設計書（ペリフェラル対応版）

## 概要

Web Bluetooth APIを使用した現在のReact Webアプリケーションを、Electronアプリケーションに移植する設計書です。この移植により、Windowsでより安定したBluetoothアクセスとデスクトップアプリケーションとしての機能を提供します。また、セントラル（Central）モードに加えて、ペリフェラル（Peripheral）モードにも対応し、BLE MIDI機器として動作可能な包括的なソリューションを実現します。

## 移植の目的

### 現在の課題
1. **Web Bluetooth API制限**: ブラウザサポートが限定的（Chrome、Edge、Opera のみ）
2. **セキュリティ制約**: HTTPS必須、ユーザー操作による接続開始が必要
3. **プラットフォーム依存**: ブラウザのBluetooth実装に依存
4. **デバッグ困難**: ブラウザ環境でのBluetooth通信のデバッグが困難
5. **機能制限**: セントラルモードのみ、ペリフェラルモード非対応

### Electron移植のメリット
1. **Native Bluetooth API**: Node.jsの`@noble/noble`と`bleno`によるより安定したBluetooth通信
2. **クロスプラットフォーム**: Windows、macOS、Linuxサポート
3. **独立実行**: ブラウザ環境に依存しない
4. **拡張機能**: ファイルシステムアクセス、システム統合が可能
5. **双方向対応**: セントラル/ペリフェラル両モードのサポート

## アーキテクチャ設計

### 全体構成

```
BLE MIDI Simulator (Electron) - Central/Peripheral対応
├── Main Process (Node.js)
│   ├── Bluetooth Manager
│   │   ├── Central Manager (noble)
│   │   └── Peripheral Manager (bleno)
│   ├── MIDI Message Handler
│   ├── Mode Controller (Central/Peripheral切替)
│   ├── IPC Communication
│   └── Window Management
└── Renderer Process (React)
    ├── UI Components (既存 + Mode選択)
    ├── IPC Client
    └── State Management
```

### Main Process（メインプロセス）

#### 1. Bluetooth Manager
- **役割**: BLEデバイスのスキャン、接続、通信管理（Central/Peripheral両対応）
- **使用ライブラリ**: `@noble/noble`（Central）、`bleno`（Peripheral）
- **Central Manager機能**:
  - 外部BLE MIDIデバイスのスキャンとフィルタリング
  - GATT接続管理
  - MIDI特性値の読み書き
  - 接続状態監視
- **Peripheral Manager機能**:
  - BLE MIDI サービスのアドバタイジング
  - GATT サーバーとしての動作
  - MIDI特性値の提供と通知
  - 複数Central接続の管理

#### 2. MIDI Message Handler
- **役割**: MIDIメッセージの送受信処理（Central/Peripheral両対応）
- **機能**:
  - BLE MIDI仕様準拠のメッセージ変換
  - タイムスタンプ処理
  - メッセージキューイング
  - Centralモード: 外部デバイスとの双方向通信
  - Peripheralモード: 接続済みCentralデバイスへの配信

#### 3. Mode Controller
- **役割**: Central/Peripheralモードの動的切替管理
- **機能**:
  - モード状態管理とモード間の排他制御
  - ライブラリ初期化・終了処理
  - モード切替時のクリーンアップ
  - 設定保存・復元

#### 4. IPC Communication
- **役割**: Main ProcessとRenderer Process間の通信
- **使用技術**: Electron IPC（ipcMain/ipcRenderer）
- **通信パターン**:
  - リクエスト/レスポンス（デバイス接続、メッセージ送信）
  - イベント配信（接続状態変更、メッセージ受信）

### Renderer Process（レンダラープロセス）

#### 1. UI Components（既存コンポーネント流用 + 新規追加）
- `ModeSelector` → Central/Peripheralモード切替（新規）
- `ConnectionManager` → IPC経由でBluetooth操作（モード別UI）
- `StandardCCSender` / `HighResCCSender` → IPC経由でMIDI送信
- `MidiLog` → IPC経由で受信メッセージ表示
- `PeripheralStatus` → アドバタイジング状態・接続状況表示（新規）

#### 2. IPC Client
- **役割**: Main Processとの通信インターフェース
- **実装**: カスタムフック（`useElectronAPI`）
- **機能**:
  - デバイス操作API（スキャン、接続、切断）
  - MIDI送信API
  - イベントリスナー（接続状態、メッセージ受信）

## 技術仕様

### 依存関係

#### 新規追加
```json
{
  "electron": "^latest",
  "@noble/noble": "^1.9.0",
  "bleno": "^0.5.0",
  "electron-builder": "^latest"
}
```

#### 開発依存関係
```json
{
  "concurrently": "^latest",
  "wait-on": "^latest"
}
```

### BLE MIDI通信仕様

#### サービス/特性値UUID（Web版と同一）
- **MIDI Service**: `03b80e5a-ede8-4b33-a751-6ce34ec4c700`
- **MIDI Characteristic**: `7772e5db-3868-4112-a1a9-f2669d106bf3`

#### メッセージフォーマット
- **送信**: `[timestampMsb, timestampLsb, ...midiMessage]`
- **受信**: BLE MIDIタイムスタンプヘッダー付きメッセージ

### IPC APIインターフェース

#### Main → Renderer Events
```typescript
interface ElectronEvents {
  // 共通イベント
  'bluetooth:error': (error: string) => void;
  'midi:messageReceived': (message: ParsedMidiMessage) => void;
  'mode:changed': (mode: 'central' | 'peripheral') => void;

  // Centralモード固有
  'bluetooth:deviceFound': (device: BluetoothDevice) => void;
  'bluetooth:connected': (device: BluetoothDevice) => void;
  'bluetooth:disconnected': () => void;

  // Peripheralモード固有
  'peripheral:advertisingStarted': () => void;
  'peripheral:advertisingStopped': () => void;
  'peripheral:centralConnected': (centralInfo: CentralInfo) => void;
  'peripheral:centralDisconnected': (centralId: string) => void;
}
```

#### Renderer → Main Methods
```typescript
interface ElectronAPI {
  // モード管理
  mode: {
    getCurrent(): Promise<'central' | 'peripheral'>;
    switchTo(mode: 'central' | 'peripheral'): Promise<void>;
  };

  // Centralモード
  central: {
    startScan(nameFilter?: string): Promise<void>;
    stopScan(): Promise<void>;
    connect(deviceId: string): Promise<void>;
    disconnect(): Promise<void>;
  };

  // Peripheralモード
  peripheral: {
    startAdvertising(deviceName: string): Promise<void>;
    stopAdvertising(): Promise<void>;
    getConnectedCentrals(): Promise<CentralInfo[]>;
    disconnectCentral(centralId: string): Promise<void>;
  };

  // MIDI共通
  midi: {
    sendMessage(message: Uint8Array): Promise<void>;
  };
}
```

### ファイル構成

```
src/
├── main/                    # Main Process
│   ├── index.ts            # エントリーポイント
│   ├── bluetooth/
│   │   ├── central-manager.ts  # Central Manager (noble)
│   │   ├── peripheral-manager.ts # Peripheral Manager (bleno)
│   │   ├── mode-controller.ts   # モード制御
│   │   └── midi-handler.ts     # MIDI Handler (共通)
│   ├── ipc/
│   │   ├── central-handlers.ts  # Central用IPC
│   │   ├── peripheral-handlers.ts # Peripheral用IPC
│   │   └── common-handlers.ts   # 共通IPC
│   └── preload.ts          # Preload Script
├── renderer/               # Renderer Process
│   ├── components/
│   │   ├── ModeSelector.tsx     # モード選択（新規）
│   │   ├── PeripheralStatus.tsx # Peripheral状態（新規）
│   │   └── ...existing files
│   ├── hooks/
│   │   └── useElectronAPI.ts
│   └── ...existing files
└── shared/
    ├── types.ts            # 共通型定義
    └── constants.ts        # BLE MIDI定数
```

## Peripheralモード詳細設計

### Peripheral Manager実装

#### BLE MIDI Serviceの提供
```typescript
// Peripheralとして提供するサービス構成
const BLE_MIDI_SERVICE = {
  uuid: '03b80e5a-ede8-4b33-a751-6ce34ec4c700',
  characteristics: [
    {
      uuid: '7772e5db-3868-4112-a1a9-f2669d106bf3',
      properties: ['read', 'writeWithoutResponse', 'notify'],
      descriptors: [
        {
          uuid: '2902', // Client Characteristic Configuration
          value: Buffer.from([0x00, 0x00]) // 通知無効
        }
      ]
    }
  ]
};
```

#### アドバタイジング設定
```typescript
const advertisingData = {
  flags: 0x06, // LE General Discoverable Mode + BR/EDR Not Supported
  completeLocalName: 'BLE MIDI Simulator',
  completeListOfServiceUUIDs: ['03b80e5a-ede8-4b33-a751-6ce34ec4c700'],
  serviceData: [
    {
      uuid: '03b80e5a-ede8-4b33-a751-6ce34ec4c700',
      data: Buffer.from([0x00]) // MIDI機器識別子
    }
  ]
};
```

### 状態管理とイベント処理

#### Peripheral状態
- **Advertising**: アドバタイジング中
- **Standby**: 待機中（アドバタイジング停止）
- **Connected**: Central接続済み
- **Error**: エラー状態

#### Central接続管理
```typescript
interface CentralInfo {
  id: string;
  address?: string;
  name?: string;
  connectionTime: Date;
  lastActivity: Date;
  mtu: number;
}
```

### MIDI通信の双方向性

#### Central → Peripheral (受信)
1. Centralがcharacteristicに書き込み
2. Peripheral Managerが受信イベント発生
3. MIDI Handlerでパース・処理
4. Renderer Processに受信メッセージ配信

#### Peripheral → Central (送信)
1. UIからMIDI送信要求
2. MIDI Handlerでパケット生成
3. 接続済み全Centralに通知送信
4. 送信結果をRenderer Processに報告

## セキュリティ考慮

### Context Isolation
- `contextIsolation: true`を設定
- preloadスクリプトによる安全なAPI公開

### Node Integration
- Renderer Processでは`nodeIntegration: false`
- Main ProcessのみでNode.js APIアクセス

### IPC通信検証
- メッセージ形式の検証
- 不正な操作の防止

## 移植戦略

### 段階的移植アプローチ

#### フェーズ1: 基盤構築
1. Electron環境セットアップ
2. 基本的なIPC通信実装
3. 既存UIの表示確認

#### フェーズ2: Central Bluetooth統合
1. @noble/nobleによるBluetooth機能実装
2. 接続管理機能の移植
3. デバイススキャン機能の移植

#### フェーズ3: MIDI通信（Centralモード）
1. MIDI送信機能の移植
2. MIDI受信機能の移植
3. メッセージパース機能の移植

#### フェーズ4: Peripheralモード実装
1. blenoによるPeripheral機能実装
2. アドバタイジング機能実装
3. GATT Server機能実装
4. モード切替機能実装

#### フェーズ5: 最適化・拡張
1. エラーハンドリング強化
2. パフォーマンス最適化
3. デスクトップアプリ特有機能追加

### 既存コードの再利用

#### 100%再利用可能
- UI Components（React）
- TypeScript型定義
- MIDIメッセージパースロジック
- スタイリング（Tailwind CSS）

#### 移植が必要
- Web Bluetooth API呼び出し → @noble/noble + bleno API
- ブラウザ固有の処理 → Electron IPC
- 単一モードUI → Central/Peripheral切替対応UI

## パフォーマンス考慮

### 最適化ポイント
1. **IPC通信の最小化**: バッチ処理によるメッセージ送信
2. **メモリ管理**: 受信メッセージログの適切な制限
3. **非同期処理**: Bluetooth操作の非ブロッキング実行

### 監視指標
- IPC通信レイテンシ
- MIDIメッセージ送信遅延
- メモリ使用量

## テスト戦略

### 単体テスト
- Bluetooth Manager機能
- MIDI Handler機能
- IPC Handler機能

### 統合テスト
- Main ↔ Renderer IPC通信
- 実機BLEデバイスとの通信

### E2Eテスト
- アプリケーション全体のワークフロー
- Central/Peripheralモード切替テスト
- 複数デバイス接続シナリオ
- Central-Peripheral間通信テスト