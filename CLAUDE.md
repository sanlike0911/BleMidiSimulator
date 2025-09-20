# BLE MIDI Simulator - React Native Migration Project

## プロジェクト概要

このプロジェクトは現在のWeb版BLE MIDI Simulatorを、React Nativeベースのクロスプラットフォームアプリケーション（Windows, Android対応）に移行し、BLEセントラル機能に加えてペリフェラル機能も実装して完全なBLE MIDIシミュレータとすることを目的としています。

## 技術スタックと依存関係

### 現在のWeb版
- **フレームワーク**: React + Vite
- **BLE通信**: Web Bluetooth API
- **TypeScript**: 完全対応
- **UI**: Tailwind CSS
- **機能**: BLE MIDIセントラルのみ

### 移行後のReact Native版
- **フレームワーク**: React Native + TypeScript
- **BLE セントラル**: react-native-ble-plx
- **MIDI プロトコル**: @midival/core + @midival/react-native
- **BLE ペリフェラル**: プラットフォーム別ネイティブモジュール
- **クロスプラットフォーム**: React Native for Windows

## プロジェクト構造

```
BleMidiSimulator/
├── App.tsx                 # メインReactアプリ（Web版）
├── components/            # 既存UIコンポーネント
├── types.ts              # TypeScript型定義
├── docs/                 # 移行計画ドキュメント
│   ├── react-native-migration-design.md
│   └── implementation-plan.md
└── [移行後の構造]
    ├── src/
    │   ├── core/
    │   │   ├── ble/
    │   │   │   ├── central/     # セントラル機能
    │   │   │   ├── peripheral/  # ペリフェラル機能
    │   │   │   └── common/
    │   │   ├── midi/           # MIDIプロトコル処理
    │   │   └── platform/       # プラットフォーム固有実装
    │   ├── components/
    │   └── native/            # ネイティブモジュール
    └── [プラットフォーム別ディレクトリ]
```

## 重要な実装ファイル

### Web版の主要ファイル
- `App.tsx:1-283` - メインアプリケーションロジック、BLE接続管理
- `components/ConnectionManager.tsx` - BLE接続UI
- `components/StandardCCSender.tsx` - 標準CC送信コンポーネント
- `components/HighResCCSender.tsx` - 高解像度CC送信コンポーネント
- `components/MidiLog.tsx` - MIDIメッセージログ表示
- `types.ts:1-18` - TypeScript型定義

### MIDI定数
```typescript
const MIDI_SERVICE_UUID = '03b80e5a-ede8-4b33-a751-6ce34ec4c700';
const MIDI_CHARACTERISTIC_UUID = '7772e5db-3868-4112-a1a9-f2669d106bf3';
```

## 開発指針とコーディングルール

### 1. TypeScriptファーストアプローチ
- 全てのコードでTypeScriptを使用
- 型安全性を最優先
- Web Bluetooth API型の制限への対応済み（`any`でのキャスト対応）

### 2. プラットフォーム抽象化
```typescript
interface PlatformBleAdapter {
  // セントラル機能
  scanForDevices(filter?: ScanFilter): Promise<BluetoothDevice[]>;
  connectToDevice(device: BluetoothDevice): Promise<Connection>;

  // ペリフェラル機能
  startAdvertising(config: AdvertisingConfig): Promise<void>;
  startGattServer(services: GattService[]): Promise<GattServer>;
}
```

### 3. 既存コードの再利用
- UIコンポーネント: 95%再利用可能
- MIDIロジック: 90%再利用可能
- BLE通信: 完全書き換え必須

### 4. エラーハンドリング
```typescript
// 既存のパターンを踏襲
try {
  // BLE操作
} catch (error) {
  if (error instanceof DOMException && error.name === 'NotFoundError') {
    // ユーザーキャンセル
  } else {
    // 実際のエラー
    console.error('BLE Error:', error);
  }
}
```

## ライブラリとツール使用指針

### BLE通信ライブラリ
1. **react-native-ble-plx** (セントラル機能)
   - 最優先選択肢
   - iOS/Android対応
   - TypeScript完全対応

2. **MIDIVal** (MIDI プロトコル)
   ```typescript
   import { MIDIVal } from "@midival/core";
   import { ReactNativeMIDIAccess } from "@midival/react-native";
   MIDIVal.configureAccessObject(new ReactNativeMIDIAccess());
   ```

3. **プラットフォーム別ペリフェラル**
   - iOS: react-native-peripheral
   - Android: カスタムネイティブモジュール
   - Windows: C++ネイティブモジュール

### 重要な制約事項
- **Expo使用不可**: BLE機能要件のため
- **Web版並行維持**: 既存ユーザー向け
- **権限管理**: 各プラットフォームの権限要求

## 実装優先順位とフェーズ管理

### フェーズ管理システム
各フェーズの完了時には、必ず実装計画書の該当フェーズステータスを以下のように更新すること：

- `[PENDING]` → `[IN PROGRESS]` → `[COMPLETED]`
- 完了確認後、次フェーズを `[IN PROGRESS]` に変更

### フェーズ1: 基盤構築 (3週間) `[IN PROGRESS]`
1. React Nativeプロジェクト初期化
2. プラットフォーム抽象化層実装
3. 既存UIコンポーネント移植

### フェーズ2: セントラル機能 (3週間) `[COMPLETED]`
1. ✅ BLEスキャン・接続機能
   - デバイススキャナー実装 (`src/core/ble/central/scanner.ts`)
   - 接続管理実装 (`src/core/ble/central/connector.ts`)
2. ✅ MIDI over BLE実装
   - MIDIパーサー実装 (`src/core/midi/parser.ts`)
   - BLE MIDIクライアント実装 (`src/core/midi/ble-midi-client.ts`)
3. ✅ 複数デバイス対応
   - 統合管理システム (`src/core/ble/ble-midi-manager.ts`)
   - 権限管理システム (`src/core/platform/permissions.ts`)

### フェーズ3: ペリフェラル機能 (4週間) `[COMPLETED]`
1. ✅ プラットフォーム別ペリフェラル実装
   - Android ペリフェラルモジュール (`src/native/android/AndroidPeripheralModule.ts`)
   - Windows ペリフェラルモジュール (`src/native/windows/WindowsPeripheralModule.ts`)
2. ✅ GATT サーバー実装
   - GATT サーバー (`src/core/ble/peripheral/gatt-server.ts`)
   - アドバタイジング管理 (`src/core/ble/peripheral/advertiser.ts`)
   - 統合ペリフェラル管理 (`src/core/ble/peripheral/peripheral-manager.ts`)
3. ✅ 仮想MIDI楽器機能
   - 仮想楽器エンジン (`src/core/instruments/virtual-instrument-engine.ts`)
   - ピアノ、ドラム、コントローラー、アルペジエーター対応

### フェーズ4: 最適化・テスト (2週間) `[PENDING]`
1. パフォーマンス最適化
2. 統合テスト
3. リリース準備

### 📋 フェーズ完了時の必須作業
1. **実装計画書更新**: `docs/implementation-plan.md` のフェーズステータス変更
2. **進捗確認**: 成果物とKPI達成度チェック
3. **次フェーズ準備**: 依存関係と前提条件の確認

## パフォーマンス要件

- **MIDI送信遅延**: < 5ms
- **BLE通信遅延**: < 20ms
- **UI応答性**: < 100ms
- **メモリ使用量**: < 100MB
- **同時接続数**: 最大8デバイス

## テスト戦略

### 必須テスト項目
1. **ユニットテスト**: Jest + React Native Testing Library
2. **統合テスト**: BLE接続・MIDI通信
3. **E2Eテスト**: Detox
4. **実機テスト**: 各プラットフォーム複数端末
5. **互換性テスト**: 主要MIDIアプリ

### テスト対象デバイス
- **Android**: FL Studio Mobile, MIDI連携アプリ
- **Windows**: Ableton Live, Cubase

## セキュリティとプライバシー

### BLE セキュリティ
- ペアリング要求: オプション設定
- 暗号化: BLE Security Level 2以上
- デバイス認証: 固有識別子使用

### データ保護
- 接続ログ: ローカル保存のみ
- デバイス情報: 暗号化保存
- MACアドレス: 匿名化対応

## トラブルシューティング

### よくある問題と対策

1. **BLE権限エラー**
   ```typescript
   // Android: 位置情報権限必要
   // Windows: Bluetooth権限確認
   ```

2. **接続失敗**
   - デバイスの検出可能性確認
   - 既存接続の切断
   - Bluetoothリセット

3. **MIDI遅延問題**
   - MTU交渉の最適化
   - パケットサイズ調整
   - 送信間隔調整

## 互換性マトリックス

| 機能 | Android | Windows |
|------|---------|----------|
| セントラル | ✅ | ✅ |
| ペリフェラル | ⚠️* | ⚠️* |
| MIDI Service | ✅ | ✅ |
| 複数接続 | ✅ | ✅ |

*カスタムネイティブモジュール必要

## リリース戦略

### 配布チャネル
- **Android**: Google Play Store + APK直接配布
- **Windows**: Microsoft Store + MSIX直接配布

### バージョニング
- **v2.0.0**: React Native基盤版
- **v2.1.0**: ペリフェラル機能追加
- **v2.2.0**: 最適化・機能追加

## 重要な注意事項

### 開発時の注意点
1. **Expo使用禁止**: BLE機能要件のため
2. **実機テスト必須**: シミュレータでBLE機能テスト不可
3. **権限処理**: 各プラットフォーム固有の実装必要
4. **バッテリー最適化**: BLE使用時の省電力対応

### ストア申請時の注意
- **Android**: 権限使用理由の説明必要
- **Windows**: UWP制限事項の確認

## 成功指標

### 技術指標
- クラッシュ率: < 0.1%
- 接続成功率: > 95%
- MIDI遅延: < 10ms
- バッテリー効率: ネイティブアプリ同等

### ユーザビリティ指標
- 初回接続時間: < 30秒
- UI応答性: < 100ms
- 学習コスト: Web版と同等

## リソースとリンク

### 重要ドキュメント
- [設計書](docs/react-native-migration-design.md)
- [実装計画](docs/implementation-plan.md)
- [現在のREADME](README.md)

### 外部リソース
- React Native BLE PLX: https://github.com/dotintent/react-native-ble-plx
- MIDIVal: https://midival.github.io/
- React Native for Windows: https://microsoft.github.io/react-native-windows/

---

この移行プロジェクトは、Web版の優れたUXを維持しながら、React Nativeの利点を活かしてクロスプラットフォーム対応とペリフェラル機能を実現することで、完全なBLE MIDIシミュレータを構築することを目標としています。