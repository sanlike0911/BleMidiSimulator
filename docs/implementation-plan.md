# React Native 移行実装計画書
BLE MIDI Simulator - 段階的実装ロードマップ

## 1. プロジェクト実行計画

### 1.1 開発期間
- **総期間**: 12週間
- **フェーズ1**: 3週間 (基盤構築)
- **フェーズ2**: 3週間 (セントラル機能)
- **フェーズ3**: 4週間 (ペリフェラル機能)
- **フェーズ4**: 2週間 (最適化・テスト)

### 1.2 リソース要件
- **React Native開発者**: 1名
- **ネイティブ開発者**: 1名 (Android/Windows)
- **MIDI専門知識**: 外部コンサルタント
- **テスト端末**: Android, Windows各2台

## 2. フェーズ別実装計画

### 📋 フェーズ管理システム

各フェーズの進捗状況は以下の状態で管理されます：

| 状態 | 説明 | マーク |
|------|------|--------|
| 🔄 進行中 | 現在実装中のフェーズ | `[IN PROGRESS]` |
| ✅ 完了 | 完了済みのフェーズ | `[COMPLETED]` |
| ⏳ 未開始 | 未着手のフェーズ | `[PENDING]` |

### フェーズ1: React Native基盤構築 (3週間) ✅ `[COMPLETED]`

#### Week 1: プロジェクト初期化
**目標**: React Nativeプロジェクトの基本構造構築

**タスク**:
1. **React Nativeプロジェクト初期化**
   ```bash
   npx react-native init BleMidiSimulatorRN --template react-native-template-typescript
   cd BleMidiSimulatorRN
   ```

2. **依存関係セットアップ**
   ```json
   {
     "dependencies": {
       "react-native-ble-plx": "^3.3.0",
       "@midival/core": "latest",
       "@midival/react-native": "latest",
       "react-native-vector-icons": "^10.0.3",
       "react-native-reanimated": "^3.6.0",
       "react-native-gesture-handler": "^2.14.0"
     }
   }
   ```

3. **プラットフォーム別セットアップ**
   - Android: Gradle設定
   - Windows: React Native for Windows追加

4. **フォルダ構造作成**
   ```
   src/
   ├── core/
   ├── components/
   ├── hooks/
   ├── utils/
   ├── types/
   └── constants/
   ```

**成果物**:
- 動作するReact Nativeアプリ
- 基本的なナビゲーション
- TypeScript設定完了

#### Week 2: プラットフォーム抽象化層
**目標**: クロスプラットフォーム対応の基盤作成

**タスク**:
1. **プラットフォーム検出**
   ```typescript
   // src/core/platform/detector.ts
   import { Platform } from 'react-native';

   export const getCurrentPlatform = () => {
     return Platform.OS; // 'ios' | 'android' | 'windows' | 'macos'
   };
   ```

2. **BLE抽象化インターフェース**
   ```typescript
   // src/core/ble/interfaces.ts
   export interface BleAdapter {
     scanForDevices(): Promise<Device[]>;
     connect(device: Device): Promise<Connection>;
     startPeripheral(): Promise<void>;
   }
   ```

3. **プラットフォーム別アダプター**
   - Android: Android BLE wrapper
   - Windows: Windows BLE wrapper

**成果物**:
- プラットフォーム抽象化完了
- 基本的なBLE権限処理
- 設定画面UI

#### Week 3: 既存UIコンポーネント移植
**目標**: 既存WebアプリのUIをReact Nativeに移植

**タスク**:
1. **コンポーネント移植**
   - ConnectionManager → React Native版
   - StandardCCSender → React Native版
   - HighResCCSender → React Native版
   - MidiLog → React Native版

2. **スタイリングシステム**
   ```typescript
   // src/styles/theme.ts
   export const theme = {
     colors: {
       background: '#111827',
       surface: '#1f2937',
       primary: '#3b82f6',
       text: '#f9fafb'
     }
   };
   ```

3. **状態管理セットアップ**
   - React Context + useReducer
   - またはRedux Toolkit

**成果物**:
- 移植されたUIコンポーネント
- 統一されたデザインシステム
- 基本的な状態管理

### フェーズ2: セントラル機能実装 (3週間) 🔄 `[IN PROGRESS]`

#### Week 4: BLE セントラル基盤
**目標**: デバイススキャンと接続機能

**タスク**:
1. **デバイススキャン実装**
   ```typescript
   // src/core/ble/central/scanner.ts
   export class BleScanner {
     async startScan(filter?: ScanFilter): Promise<void> {
       // react-native-ble-plx を使用
     }
   }
   ```

2. **接続管理**
   ```typescript
   // src/core/ble/central/connector.ts
   export class BleConnector {
     async connect(device: Device): Promise<Connection> {
       // 接続ロジック
     }
   }
   ```

3. **権限処理**
   - Android: 位置情報権限
   - Windows: Bluetooth権限

**成果物**:
- デバイススキャン機能
- 接続・切断機能
- 権限処理完了

#### Week 5: MIDI プロトコル実装
**目標**: MIDI over BLE通信機能

**タスク**:
1. **MIDI over BLE実装**
   ```typescript
   // src/core/midi/ble-midi.ts
   export class BleMidiClient {
     async sendMidiMessage(message: MidiMessage): Promise<void> {
       const packet = this.wrapInBleMidiPacket(message);
       await this.characteristic.writeValueWithoutResponse(packet);
     }
   }
   ```

2. **MIDIメッセージパーサー**
   ```typescript
   // src/core/midi/parser.ts
   export class MidiParser {
     parse(data: ArrayBuffer): MidiMessage[] {
       // BLE MIDIパケット解析
     }
   }
   ```

3. **MIDIVal統合**
   ```typescript
   import { MIDIVal } from "@midival/core";
   import { ReactNativeMIDIAccess } from "@midival/react-native";

   MIDIVal.configureAccessObject(new ReactNativeMIDIAccess());
   ```

**成果物**:
- MIDI over BLE送受信
- リアルタイムMIDIログ
- 高解像度CC対応

#### Week 6: セントラル機能完成
**目標**: セントラル機能の完全実装

**タスク**:
1. **複数デバイス対応**
   ```typescript
   // src/core/ble/central/multi-connection.ts
   export class MultiConnectionManager {
     private connections: Map<string, Connection> = new Map();
   }
   ```

2. **エラーハンドリング**
   - 接続失敗時の自動リトライ
   - デバイス切断時の自動再接続
   - 通信エラー時の回復処理

3. **パフォーマンス最適化**
   - MIDIメッセージキューイング
   - バッファリング最適化
   - メモリリーク防止

**成果物**:
- 完全なセントラル機能
- 安定した複数デバイス接続
- エラー処理とログ機能

### フェーズ3: ペリフェラル機能実装 (4週間) `[PENDING]`

#### Week 7-8: ペリフェラル基盤
**目標**: BLE ペリフェラル機能の基盤構築

**タスク**:
1. **プラットフォーム別ペリフェラル実装**

   **Android実装**:
   ```java
   // android/app/src/main/java/PeripheralModule.java
   public class PeripheralModule extends ReactContextBaseJavaModule {
     private BluetoothGattServer gattServer;
   }
   ```

   **Windows実装**:
   ```cpp
   // windows/PeripheralModule/PeripheralModule.cpp
   #include <windows.devices.bluetooth.h>

   class WindowsPeripheralManager {
     winrt::Windows::Devices::Bluetooth::Advertisement::BluetoothLEAdvertisementPublisher publisher;
   };
   ```

2. **GATT サーバー実装**
   ```typescript
   // src/core/ble/peripheral/gatt-server.ts
   export class MidiGattServer {
     private services: GattService[] = [];

     async addMidiService(): Promise<void> {
       const service = {
         uuid: MIDI_SERVICE_UUID,
         characteristics: [
           {
             uuid: MIDI_CHARACTERISTIC_UUID,
             properties: ['read', 'write', 'notify'],
             permissions: ['readable', 'writeable']
           }
         ]
       };
       this.services.push(service);
     }
   }
   ```

**成果物**:
- プラットフォーム別ペリフェラル実装
- 基本的なGATTサーバー
- アドバタイジング機能

#### Week 9-10: MIDI ペリフェラル機能
**目標**: MIDI対応ペリフェラル機能完成

**タスク**:
1. **MIDI サービス実装**
   ```typescript
   // src/core/ble/peripheral/midi-service.ts
   export class MidiPeripheralService {
     async handleMidiWrite(data: ArrayBuffer): Promise<void> {
       const messages = this.parseMidiPacket(data);
       this.onMidiReceived?.(messages);
     }

     async sendMidiToClients(message: MidiMessage): Promise<void> {
       const packet = this.wrapInBleMidiPacket(message);
       await this.notifyClients(packet);
     }
   }
   ```

2. **仮想MIDI楽器**
   ```typescript
   // src/core/midi/virtual-instruments.ts
   export class VirtualPiano {
     playNote(note: number, velocity: number): void {
       const message = new NoteOnMessage(0, note, velocity);
       this.midiService.sendMidiToClients(message);
     }
   }
   ```

3. **クライアント管理**
   ```typescript
   // src/core/ble/peripheral/client-manager.ts
   export class ClientManager {
     private connectedClients: BluetoothDevice[] = [];

     async notifyAllClients(data: ArrayBuffer): Promise<void> {
       // 全接続クライアントに通知
     }
   }
   ```

**成果物**:
- 完全なMIDIペリフェラル機能
- 仮想楽器機能
- マルチクライアント対応

### フェーズ4: 最適化・テスト (2週間) `[PENDING]`

#### Week 11: パフォーマンス最適化
**目標**: アプリケーションの性能向上

**タスク**:
1. **レイテンシ最適化**
   - MIDIメッセージ送信遅延の最小化
   - UIスレッドブロッキング回避
   - ネイティブモジュール最適化

2. **メモリ最適化**
   - メッセージログの自動削除
   - 未使用接続のクリーンアップ
   - ガベージコレクション最適化

3. **バッテリー最適化**
   - BLEスキャン頻度調整
   - バックグラウンド処理最適化
   - 省電力モード実装

**成果物**:
- 最適化されたパフォーマンス
- 詳細なパフォーマンスレポート
- メモリリーク検査結果

#### Week 12: 総合テスト・リリース準備
**目標**: 本番リリース準備完了

**タスク**:
1. **統合テスト**
   ```typescript
   // __tests__/integration/ble-midi.test.ts
   describe('BLE MIDI Integration', () => {
     test('should connect and send MIDI', async () => {
       // 統合テストシナリオ
     });
   });
   ```

2. **実機テスト**
   - Android実機テスト (タブレット, スマートフォン)
   - Windows PCテスト

3. **互換性テスト**
   - FL Studio Mobile (Android)
   - Ableton Live (Windows)
   - Cubase (Windows)

**成果物**:
- 完全にテストされたアプリケーション
- リリース用バイナリ
- ユーザーマニュアル

## 3. 技術実装詳細

### 3.1 react-native-ble-plx 設定
```typescript
// src/core/ble/ble-manager.ts
import { BleManager, Device } from 'react-native-ble-plx';

export class AppBleManager {
  private manager: BleManager;

  constructor() {
    this.manager = new BleManager();
  }

  async initializeBLE(): Promise<void> {
    const state = await this.manager.state();
    if (state !== 'PoweredOn') {
      throw new Error('Bluetooth is not available');
    }
  }

  async scanForMidiDevices(): Promise<Device[]> {
    const devices: Device[] = [];

    this.manager.startDeviceScan(
      [MIDI_SERVICE_UUID],
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          console.error('Scan error:', error);
          return;
        }

        if (device && !devices.find(d => d.id === device.id)) {
          devices.push(device);
        }
      }
    );

    return new Promise((resolve) => {
      setTimeout(() => {
        this.manager.stopDeviceScan();
        resolve(devices);
      }, 10000);
    });
  }
}
```

### 3.2 プラットフォーム別ペリフェラル実装

#### Android ペリフェラル (Java/Kotlin)
```java
// android/app/src/main/java/PeripheralModule.java
public class PeripheralModule extends ReactContextBaseJavaModule {
    private BluetoothManager bluetoothManager;
    private BluetoothGattServer gattServer;
    private BluetoothLeAdvertiser advertiser;

    @ReactMethod
    public void startAdvertising(Promise promise) {
        BluetoothGattService service = new BluetoothGattService(
            UUID.fromString(MIDI_SERVICE_UUID),
            BluetoothGattService.SERVICE_TYPE_PRIMARY
        );

        BluetoothGattCharacteristic characteristic = new BluetoothGattCharacteristic(
            UUID.fromString(MIDI_CHARACTERISTIC_UUID),
            BluetoothGattCharacteristic.PROPERTY_READ |
            BluetoothGattCharacteristic.PROPERTY_WRITE |
            BluetoothGattCharacteristic.PROPERTY_NOTIFY,
            BluetoothGattCharacteristic.PERMISSION_READ |
            BluetoothGattCharacteristic.PERMISSION_WRITE
        );

        service.addCharacteristic(characteristic);
        gattServer.addService(service);

        // Start advertising
        AdvertiseSettings settings = new AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_BALANCED)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM)
            .setConnectable(true)
            .build();

        advertiser.startAdvertising(settings, advertiseData, advertiseCallback);
        promise.resolve(true);
    }
}
```

### 3.3 Windows ペリフェラル (C++)
```cpp
// windows/BleMidiSimulatorRN/PeripheralModule.cpp
#include "pch.h"
#include "PeripheralModule.h"
#include <winrt/Windows.Devices.Bluetooth.h>
#include <winrt/Windows.Devices.Bluetooth.Advertisement.h>

using namespace winrt;
using namespace Windows::Devices::Bluetooth;
using namespace Windows::Devices::Bluetooth::Advertisement;

class PeripheralModule {
private:
    BluetoothLEAdvertisementPublisher publisher;

public:
    void StartAdvertising() {
        BluetoothLEAdvertisement advertisement;

        // Add MIDI service UUID
        auto serviceUuid = winrt::guid(MIDI_SERVICE_UUID);
        advertisement.ServiceUuids().Append(serviceUuid);

        publisher.Advertisement(advertisement);
        publisher.Start();
    }
};
```

## 4. テスト戦略

### 4.1 ユニットテスト
```typescript
// __tests__/unit/midi-parser.test.ts
import { MidiParser } from '../src/core/midi/parser';

describe('MidiParser', () => {
  test('should parse Note On message', () => {
    const parser = new MidiParser();
    const data = new Uint8Array([0x90, 0x40, 0x7F]); // Note On, C4, velocity 127
    const messages = parser.parse(data.buffer);

    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('Note On');
    expect(messages[0].note).toBe(0x40);
    expect(messages[0].velocity).toBe(0x7F);
  });
});
```

### 4.2 統合テスト
```typescript
// __tests__/integration/ble-connection.test.ts
import { BleManager } from '../src/core/ble/ble-manager';

describe('BLE Connection', () => {
  test('should scan and connect to device', async () => {
    const bleManager = new BleManager();
    await bleManager.initializeBLE();

    const devices = await bleManager.scanForMidiDevices();
    expect(devices.length).toBeGreaterThan(0);

    const device = devices[0];
    const connection = await bleManager.connectToDevice(device);
    expect(connection.isConnected()).toBe(true);
  });
});
```

### 4.3 E2Eテスト (Detox)
```typescript
// e2e/ble-midi.e2e.ts
describe('BLE MIDI E2E', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should connect to BLE device and send MIDI', async () => {
    await element(by.id('scan-button')).tap();
    await waitFor(element(by.id('device-list'))).toBeVisible().withTimeout(5000);

    await element(by.id('device-0')).tap();
    await expect(element(by.id('connection-status'))).toHaveText('Connected');

    await element(by.id('cc-slider')).swipe('right');
    await expect(element(by.id('midi-log'))).toBeVisible();
  });
});
```

## 5. デプロイメント戦略

### 5.1 ビルド設定
```json
// package.json scripts
{
  "scripts": {
    "android:build": "cd android && ./gradlew assembleRelease",
    "windows:build": "npx react-native run-windows --release",
    "build:all": "npm run android:build && npm run windows:build"
  }
}
```

### 5.2 配布チャネル
- **Android**: Google Play Store + APK直接配布
- **Windows**: Microsoft Store + MSIX直接配布

### 5.3 CI/CD パイプライン
```yaml
# .github/workflows/build.yml
name: Build and Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test

  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
      - run: cd android && ./gradlew assembleRelease

  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - run: npx react-native run-windows --release
```

## 6. リスク管理

### 6.1 技術リスク
| リスク | 影響度 | 確率 | 対策 |
|--------|--------|------|------|
| Windows BLE API制限 | 高 | 中 | ネイティブC++実装準備 |
| Google Play Store審査 | 中 | 低 | BLE使用理由明確化 |
| Android権限問題 | 中 | 中 | 段階的権限要求 |
| パフォーマンス問題 | 高 | 中 | 早期プロファイリング |

### 6.2 スケジュールリスク
- **遅延要因**: ネイティブモジュール開発
- **対策**: 外部専門家の早期参画
- **バッファ**: 各フェーズに1週間予備

### 6.3 品質リスク
- **対策**: 継続的インテグレーション
- **実機テスト**: 各プラットフォーム複数端末
- **ベータテスト**: 限定ユーザーグループ

## 7. 成功指標と評価

### 7.1 KPI
- **機能完成度**: 100% (全機能実装)
- **クラッシュ率**: < 0.1%
- **接続成功率**: > 95%
- **MIDI遅延**: < 10ms
- **ユーザー満足度**: > 4.5/5.0

### 7.2 マイルストーン
- **Month 1**: React Native基盤完成
- **Month 2**: セントラル機能完成
- **Month 3**: ペリフェラル機能完成
- **Month 3+**: 最適化・リリース

この実装計画に従って、現在のWeb版BLE MIDI SimulatorをReact Nativeに移行し、完全なBLE MIDIシミュレータ（セントラル+ペリフェラル）として生まれ変わらせることができます。