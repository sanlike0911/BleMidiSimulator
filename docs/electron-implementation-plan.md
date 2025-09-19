# BLE MIDI Simulator - Electron実装計画書（ペリフェラル対応版）

## 実装スケジュール

### 全体タイムライン（推定6-8週間）

```
Week 1-2: 基盤構築 (フェーズ1)
Week 3-4: Central Bluetooth統合 (フェーズ2)
Week 5: MIDI通信実装（Centralモード） (フェーズ3)
Week 6-7: Peripheralモード実装 (フェーズ4)
Week 8: 最適化・テスト (フェーズ5)
```

## フェーズ1: 基盤構築（Week 1-2）

### 1.1 開発環境セットアップ

#### 必要な作業
- [x] Electronのインストールと設定
- [x] TypeScript環境の拡張
- [x] ビルドスクリプトの設定
- [x] 開発用hot-reloadの設定

#### 実装ファイル
```
package.json (更新)
tsconfig.json (更新)
src/main/index.ts (新規)
src/main/preload.ts (新規)
vite.config.ts (更新)
```

#### 設定詳細

**package.json更新**
```json
{
  "main": "dist/main/index.js",
  "scripts": {
    "electron": "electron .",
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron .\"",
    "build:main": "tsc -p src/main/tsconfig.json",
    "build:electron": "npm run build && npm run build:main",
    "dist": "electron-builder"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.0.0",
    "concurrently": "^8.0.0",
    "wait-on": "^7.0.0"
  },
  "dependencies": {
    "@noble/noble": "^1.9.0",
    "bleno": "^0.5.0"
  }
}
```

**Electron Main Process基本構造**
```typescript
// src/main/index.ts
import { app, BrowserWindow } from 'electron';
import path from 'path';

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}
```

### 1.2 IPC基盤の実装

#### 実装ファイル
```
src/main/ipc/handlers.ts (新規)
src/main/preload.ts (更新)
src/renderer/hooks/useElectronAPI.ts (新規)
src/shared/types.ts (新規)
```

#### IPC基本インターフェース
```typescript
// src/shared/types.ts
export interface ElectronAPI {
  // モード管理
  mode: {
    getCurrent(): Promise<'central' | 'peripheral'>;
    switchTo(mode: 'central' | 'peripheral'): Promise<void>;
  };

  // Centralモード
  central: {
    isAvailable(): Promise<boolean>;
    startScan(nameFilter?: string): Promise<void>;
    stopScan(): Promise<void>;
    connect(deviceId: string): Promise<void>;
    disconnect(): Promise<void>;
  };

  // Peripheralモード
  peripheral: {
    isAvailable(): Promise<boolean>;
    startAdvertising(deviceName: string): Promise<void>;
    stopAdvertising(): Promise<void>;
    getConnectedCentrals(): Promise<CentralInfo[]>;
    disconnectCentral(centralId: string): Promise<void>;
  };

  // MIDI共通
  midi: {
    sendMessage(message: Uint8Array): Promise<void>;
  };

  on(channel: string, listener: (...args: any[]) => void): void;
  removeAllListeners(channel: string): void;
}

export interface CentralInfo {
  id: string;
  address?: string;
  name?: string;
  connectionTime: Date;
  lastActivity: Date;
  mtu: number;
}
```

### 1.3 React UIの基本表示確認

#### 作業内容
- [x] Electron内でのReactアプリ表示確認
- [x] hot-reloadの動作確認
- [x] 基本的なIPC通信テスト
- [x] 既存コンポーネントの表示確認

## フェーズ2: Central Bluetooth統合（Week 3-4）

### 2.1 Bluetooth Manager実装

#### 実装ファイル
```
src/main/bluetooth/central-manager.ts (新規)
src/main/bluetooth/mode-controller.ts (新規)
src/shared/constants.ts (新規)
```

#### Central Manager機能
```typescript
// src/main/bluetooth/central-manager.ts
import noble from '@noble/noble';

export class CentralManager {
  private scanning = false;
  private connectedPeripheral: noble.Peripheral | null = null;

  async startScan(nameFilter?: string): Promise<void> {
    // デバイススキャン実装
  }

  async connect(deviceId: string): Promise<void> {
    // デバイス接続実装
  }

  async disconnect(): Promise<void> {
    // デバイス切断実装
  }

  private setupMidiCharacteristic(): Promise<void> {
    // MIDI特性値セットアップ
  }
}
```

### 2.2 デバイススキャン機能

#### 実装詳細
- [ ] BLE MIDIサービスUUIDによるフィルタリング
- [ ] デバイス名による追加フィルタリング
- [ ] スキャン結果のRenderer Processへの送信
- [ ] スキャン状態管理

#### BLE MIDI仕様準拠
```typescript
const MIDI_SERVICE_UUID = '03b80e5a-ede8-4b33-a751-6ce34ec4c700';
const MIDI_CHARACTERISTIC_UUID = '7772e5db-3868-4112-a1a9-f2669d106bf3';
```

### 2.3 接続管理機能

#### 実装内容
- [ ] GATT接続処理
- [ ] 接続状態監視
- [ ] 自動再接続機能
- [ ] エラーハンドリング

### 2.4 UIの接続機能更新

#### 更新ファイル
```
src/renderer/components/ConnectionManager.tsx (更新)
src/renderer/hooks/useElectronAPI.ts (更新)
```

#### 主な変更点
- Web Bluetooth API呼び出し → Electron IPC呼び出し
- イベントリスナーの変更
- エラーハンドリングの更新

## フェーズ3: MIDI通信実装（Centralモード）（Week 5）

### 3.1 MIDI Handler実装

#### 実装ファイル
```
src/main/bluetooth/midi-handler.ts (新規)
```

#### MIDI Handler機能
```typescript
export class MidiHandler {
  async sendMidiMessage(message: Uint8Array): Promise<void> {
    // BLE MIDIフォーマットでメッセージ送信
  }

  private parseMidiMessage(data: Buffer): ParsedMidiMessage | null {
    // 受信メッセージのパース
  }

  private createBLEMidiPacket(midiMessage: Uint8Array): Buffer {
    // BLE MIDIパケット生成
  }
}
```

### 3.2 MIDI送信機能

#### 実装内容
- [ ] Standard CC (7-bit) 送信
- [ ] High-Resolution CC (14-bit) 送信
- [ ] BLE MIDIタイムスタンプ処理
- [ ] 送信エラーハンドリング

#### UIコンポーネント更新
```
src/renderer/components/StandardCCSender.tsx (更新)
src/renderer/components/HighResCCSender.tsx (更新)
```

### 3.3 MIDI受信機能

#### 実装内容
- [ ] 受信データのパース
- [ ] メッセージタイプ判定
- [ ] リアルタイム表示更新
- [ ] ログサイズ制限

#### UIコンポーネント更新
```
src/renderer/components/MidiLog.tsx (更新)
```

### 3.4 統合テスト

#### テスト項目
- [ ] デバイス接続・切断
- [ ] MIDI送信・受信
- [ ] エラーケース処理
- [ ] パフォーマンス確認

## フェーズ4: Peripheralモード実装（Week 6-7）

### 4.1 Peripheral Manager実装

#### 実装ファイル
```
src/main/bluetooth/peripheral-manager.ts (新規)
```

#### Peripheral Manager機能
```typescript
// src/main/bluetooth/peripheral-manager.ts
import bleno from 'bleno';

export class PeripheralManager {
  private advertising = false;
  private connectedCentrals = new Map<string, CentralInfo>();
  private midiCharacteristic: any = null;

  async startAdvertising(deviceName: string): Promise<void> {
    // アドバタイジング開始
  }

  async stopAdvertising(): Promise<void> {
    // アドバタイジング停止
  }

  async notifyAllCentrals(data: Buffer): Promise<void> {
    // 接続済み全Centralに通知
  }

  private setupGattServer(): Promise<void> {
    // GATT Server設定
  }
}
```

### 4.2 BLE MIDI Service実装

#### GATT Service設定
```typescript
const BLE_MIDI_SERVICE_UUID = '03b80e5a-ede8-4b33-a751-6ce34ec4c700';
const BLE_MIDI_CHARACTERISTIC_UUID = '7772e5db-3868-4112-a1a9-f2669d106bf3';

const midiCharacteristic = new bleno.Characteristic({
  uuid: BLE_MIDI_CHARACTERISTIC_UUID,
  properties: ['read', 'writeWithoutResponse', 'notify'],
  value: null,
  onReadRequest: (offset, callback) => {
    // Read処理
  },
  onWriteRequest: (data, offset, withoutResponse, callback) => {
    // Write処理（MIDI受信）
  },
  onSubscribe: (maxValueSize, updateValueCallback) => {
    // 通知購読開始
  },
  onUnsubscribe: () => {
    // 通知購読停止
  }
});
```

### 4.3 Mode Controller実装

#### モード管理機能
```typescript
// src/main/bluetooth/mode-controller.ts
export class ModeController {
  private currentMode: 'central' | 'peripheral' = 'central';
  private centralManager: CentralManager;
  private peripheralManager: PeripheralManager;

  async switchMode(mode: 'central' | 'peripheral'): Promise<void> {
    // 現在のモード終了
    await this.cleanup();

    // 新しいモード初期化
    this.currentMode = mode;
    await this.initialize();
  }

  private async cleanup(): Promise<void> {
    // リソースクリーンアップ
  }

  private async initialize(): Promise<void> {
    // モード初期化
  }
}
```

### 4.4 UI Components実装

#### 新規コンポーネント
```
src/renderer/components/ModeSelector.tsx (新規)
src/renderer/components/PeripheralStatus.tsx (新規)
```

#### ModeSelector実装
```typescript
// モード選択UI
const ModeSelector = () => {
  const [currentMode, setCurrentMode] = useState<'central' | 'peripheral'>('central');

  const handleModeChange = async (mode: 'central' | 'peripheral') => {
    await window.electronAPI.mode.switchTo(mode);
    setCurrentMode(mode);
  };

  return (
    <div className="mode-selector">
      <button
        onClick={() => handleModeChange('central')}
        className={currentMode === 'central' ? 'active' : ''}
      >
        Central Mode
      </button>
      <button
        onClick={() => handleModeChange('peripheral')}
        className={currentMode === 'peripheral' ? 'active' : ''}
      >
        Peripheral Mode
      </button>
    </div>
  );
};
```

## フェーズ5: 最適化・拡張（Week 8）

### 5.1 エラーハンドリング強化

#### 改善内容
- [ ] Bluetooth接続エラー詳細化
- [ ] MIDI通信エラー対応
- [ ] ユーザーフレンドリーなエラーメッセージ
- [ ] 自動復旧機能

### 5.2 パフォーマンス最適化

#### 最適化項目
- [ ] IPC通信の最適化
- [ ] メモリ使用量削減
- [ ] MIDI送信遅延の最小化
- [ ] UI応答性向上

### 5.3 デスクトップアプリ機能追加

#### 追加機能候補
- [ ] ファイルメニュー（設定保存/読込）
- [ ] キーボードショートカット
- [ ] システムトレイ対応
- [ ] MIDI設定プリセット
- [ ] ログファイル出力

### 5.4 ビルド・配布設定

#### 実装内容
- [ ] electron-builder設定
- [ ] Windows installer作成
- [ ] 自動更新機能（任意）
- [ ] 署名・公証設定

#### electron-builder設定例
```json
{
  "build": {
    "appId": "com.example.ble-midi-simulator",
    "productName": "BLE MIDI Simulator",
    "directories": {
      "output": "dist"
    },
    "files": [
      "dist/**/*",
      "node_modules/**/*"
    ],
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    }
  }
}
```

## リスク管理

### 技術的リスク

#### 高リスク
1. **Bluetooth権限問題**: Windows環境でのBluetooth権限要求
   - **対策**: 事前テスト、ユーザーガイド作成

2. **@noble/noble + bleno互換性**: BLE MIDIデバイスとの互換性問題
   - **対策**: 複数デバイスでのテスト、フォールバック機能

3. **ライブラリ競合**: nobleとblenoの同時利用時の競合
   - **対策**: 排他制御実装、適切なクリーンアップ

#### 中リスク
1. **IPC通信パフォーマンス**: 大量MIDI送信時の遅延
   - **対策**: バッチ処理、通信最適化

2. **メモリリーク**: 長時間使用時のメモリ増加
   - **対策**: 適切なクリーンアップ、監視機能

3. **Peripheralモードの複雑性**: 複数Central接続管理
   - **対策**: 段階的実装、十分なテスト期間確保

### 開発リスク

#### スケジュール遅延要因
1. Bluetooth API習得時間（noble + bleno）
2. 実機テスト環境の準備
3. Windows固有問題の対応
4. Peripheralモード実装の複雑性
5. Central/Peripheral間の相互運用性テスト

#### 対策
- 早期プロトタイプ作成
- 段階的リリース
- 継続的テスト実施

## 品質保証

### テスト戦略

#### 単体テスト
```
src/main/__tests__/
├── bluetooth/
│   ├── central-manager.test.ts
│   ├── peripheral-manager.test.ts
│   ├── mode-controller.test.ts
│   └── midi-handler.test.ts
└── ipc/
    ├── central-handlers.test.ts
    ├── peripheral-handlers.test.ts
    └── common-handlers.test.ts
```

#### 統合テスト
- Main ↔ Renderer IPC通信
- Central Manager統合テスト
- Peripheral Manager統合テスト
- Mode Controller統合テスト
- 実機BLEデバイステスト

#### E2Eテスト
- アプリケーション全体ワークフロー
- Central/Peripheralモード切替テスト
- マルチデバイス接続テスト
- Central-Peripheral間通信テスト
- 長時間稼働テスト

### 継続的インテグレーション

#### GitHub Actions設定
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run build:electron
```

## 成功指標

### 機能指標
- [ ] 既存Web版と同等の機能実現
- [ ] Central/Peripheralモード切替機能
- [ ] 5秒以内のデバイス接続（Central）
- [ ] 3秒以内のアドバタイジング開始（Peripheral）
- [ ] 10ms以下のMIDI送信遅延
- [ ] 24時間以上の安定稼働（両モード）

### 品質指標
- [ ] 単体テストカバレッジ90%以上
- [ ] 統合テスト100%パス
- [ ] メモリリークなし
- [ ] クラッシュなし（8時間連続稼働）

### ユーザビリティ指標
- [ ] 起動時間3秒以内
- [ ] 直感的なUI操作（モード切替含む）
- [ ] 明確なエラーメッセージ
- [ ] ヘルプドキュメント完備
- [ ] Central/Peripheral状態の視覚的表示