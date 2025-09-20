# React Native 移行設計書
BLE MIDI Simulator - React Native 移行とクロスプラットフォーム対応

## 1. プロジェクト概要

### 1.1 現在のアーキテクチャ
- **フレームワーク**: React + Vite (Web)
- **BLE通信**: Web Bluetooth API
- **対象プラットフォーム**: Web ブラウザのみ
- **機能**: BLE MIDIセントラル（デバイスへの接続・送信・受信）

### 1.2 移行後のアーキテクチャ
- **フレームワーク**: React Native
- **BLE通信**: react-native-ble-plx + ネイティブモジュール
- **対象プラットフォーム**: Windows, Android
- **機能**: BLE MIDIセントラル + ペリフェラル（完全なシミュレータ）

## 2. 技術要件分析

### 2.1 React Native 移行
#### 推奨ライブラリ
1. **react-native-ble-plx** (セントラル機能)
   - 最も成熟したReact Native BLEライブラリ
   - iOS/Android対応
   - 2.9k stars, 12.3k weekly downloads
   - TypeScript対応

2. **MIDIVal** (MIDI プロトコル)
   - クロスプラットフォームMIDIライブラリ
   - TypeScript完全対応
   - React Native iOS/Android対応

3. **React Native for Windows** (デスクトップ対応)
   - v0.76+ の新アーキテクチャを使用
   - Windows App SDK統合
   - Win32アプリケーション対応

### 2.2 BLE ペリフェラル機能
#### 現在の制限事項
- **react-native-ble-plx**: ペリフェラルモード未対応
- **react-native-peripheral**: iOS のみ対応
- **Windows/Mac**: ネイティブペリフェラル対応限定的

#### 推奨アプローチ
1. **ハイブリッド実装**
   - Android: カスタムネイティブモジュール
   - Windows: 専用ネイティブライブラリ

2. **GATT サーバー仕様**
   - MIDI Service UUID: `03b80e5a-ede8-4b33-a751-6ce34ec4c700`
   - MIDI Characteristic UUID: `7772e5db-3868-4112-a1a9-f2669d106bf3`
   - Read/Write/Notify特性

## 3. アーキテクチャ設計

### 3.1 モジュール構成
```
src/
├── core/
│   ├── ble/
│   │   ├── central/         # セントラル機能
│   │   │   ├── scanner.ts
│   │   │   ├── connector.ts
│   │   │   └── client.ts
│   │   ├── peripheral/      # ペリフェラル機能
│   │   │   ├── advertiser.ts
│   │   │   ├── gatt-server.ts
│   │   │   └── midi-service.ts
│   │   └── common/
│   │       ├── types.ts
│   │       └── constants.ts
│   ├── midi/
│   │   ├── parser.ts        # MIDIメッセージ解析
│   │   ├── generator.ts     # MIDIメッセージ生成
│   │   └── protocol.ts      # BLE MIDIプロトコル
│   └── platform/
│       ├── android.ts       # Android固有実装
│       └── windows.ts       # Windows固有実装
├── components/
│   ├── central/             # セントラル機能UI
│   ├── peripheral/          # ペリフェラル機能UI
│   └── common/
└── native/
    ├── android/             # Androidネイティブモジュール
    └── windows/             # Windowsネイティブモジュール
```

### 3.2 状態管理
```typescript
interface AppState {
  mode: 'central' | 'peripheral' | 'both';
  central: {
    deviceState: MidiDeviceState;
    connectedDevices: BluetoothDevice[];
    scanResults: BluetoothDevice[];
  };
  peripheral: {
    isAdvertising: boolean;
    isGattServerRunning: boolean;
    connectedClients: BluetoothDevice[];
    midiService: MidiGattService;
  };
  midi: {
    receivedMessages: ParsedMidiMessage[];
    sentMessages: ParsedMidiMessage[];
  };
}
```

### 3.3 プラットフォーム抽象化
```typescript
interface PlatformBleAdapter {
  // セントラル機能
  scanForDevices(filter?: ScanFilter): Promise<BluetoothDevice[]>;
  connectToDevice(device: BluetoothDevice): Promise<Connection>;
  disconnectFromDevice(device: BluetoothDevice): Promise<void>;

  // ペリフェラル機能
  startAdvertising(config: AdvertisingConfig): Promise<void>;
  stopAdvertising(): Promise<void>;
  startGattServer(services: GattService[]): Promise<GattServer>;
  stopGattServer(): Promise<void>;
}
```

## 4. UI/UX 設計

### 4.1 モード切替インターフェース
- **タブ形式**: Central / Peripheral / Both
- **統合ダッシュボード**: 両モード同時表示
- **クイック切替**: ワンタップでモード変更

### 4.2 ペリフェラルモード UI
```
┌─────────────────────────────────┐
│ BLE MIDI Peripheral Mode        │
├─────────────────────────────────┤
│ ● Advertising Status: [ON/OFF]  │
│ Device Name: [BLE MIDI Sim]     │
│ Service UUID: [03b80e5a...]     │
├─────────────────────────────────┤
│ Connected Clients: (2)          │
│ ○ Client 1 - iPad Pro          │
│ ○ Client 2 - Android Phone     │
├─────────────────────────────────┤
│ Virtual MIDI Controls:          │
│ [Note Generator] [CC Generator] │
│ [Arpeggiator]   [Drum Pattern] │
└─────────────────────────────────┘
```

### 4.3 統合ログビューア
- **送受信メッセージ統合表示**
- **フィルタリング機能**
- **リアルタイム更新**
- **エクスポート機能**

## 5. パフォーマンス要件

### 5.1 レイテンシ要件
- **MIDI送信遅延**: < 5ms
- **BLE通信遅延**: < 20ms
- **UI応答性**: < 100ms

### 5.2 スループット要件
- **MIDI メッセージレート**: 1000 msg/sec
- **同時接続数**: 最大8デバイス
- **データ転送レート**: 31.25 kbps (MIDI規格)

### 5.3 リソース制約
- **メモリ使用量**: < 100MB
- **CPU使用率**: < 10% (アイドル時)
- **バッテリー消費**: 最適化済み省電力モード

## 6. セキュリティ要件

### 6.1 BLE セキュリティ
- **ペアリング要求**: オプション設定可能
- **暗号化**: BLE Security Level 2以上
- **認証**: デバイス固有識別子

### 6.2 データ保護
- **接続ログ**: ローカル保存のみ
- **デバイス情報**: 暗号化保存
- **プライバシー**: MAC アドレス匿名化

## 7. 互換性要件

### 7.1 BLE MIDI 仕様準拠
- **MIDI Manufacturers Association**: BLE MIDI 1.0仕様
- **Service UUID**: 標準MIDI Service
- **Characteristic**: 標準MIDI I/O特性

### 7.2 既存デバイス互換性
- **Android MIDI アプリ**: 対応
- **Windows DAW**: ASIO/DirectSound対応

## 8. 移行戦略

### 8.1 段階的移行
1. **フェーズ1**: React Native基盤構築
2. **フェーズ2**: セントラル機能移植
3. **フェーズ3**: ペリフェラル機能追加
4. **フェーズ4**: クロスプラットフォーム最適化

### 8.2 既存コード活用
- **UI コンポーネント**: 95%再利用可能
- **MIDI ロジック**: 90%再利用可能
- **BLE通信**: 完全書き換え必要

### 8.3 テスト戦略
- **ユニットテスト**: Jest + React Native Testing Library
- **統合テスト**: Detox (E2E)
- **デバイステスト**: 実機テスト必須
- **互換性テスト**: 主要MIDIアプリとの連携確認

## 9. 技術的課題と対策

### 9.1 主要課題
1. **Windows ペリフェラル対応**
   - 対策: カスタムネイティブモジュール開発


2. **Android BLE権限管理**
   - 対策: 段階的権限要求フロー

### 9.2 制限事項
- **Expo**: 使用不可（BLE要件のため）
- **Web版**: 並行維持が必要
- **Google Play Store**: BLE使用理由の明記必要

## 10. 成功指標

### 10.1 技術指標
- **クラッシュ率**: < 0.1%
- **接続成功率**: > 95%
- **MIDI遅延**: < 10ms
- **バッテリー効率**: ネイティブアプリ同等

### 10.2 ユーザビリティ指標
- **初回接続時間**: < 30秒
- **UI応答性**: < 100ms
- **学習コスト**: 既存Web版と同等