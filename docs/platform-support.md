# プラットフォームサポート状況

## サポート対象プラットフォーム

### ✅ 完全対応済み
- **Android** (API 21+)
  - BLE Central: ✅ (react-native-ble-plx)
  - BLE Peripheral: ✅ (ネイティブモジュール)
  - MIDI Support: ✅ (@midival/react-native)

### 🔧 部分対応（要ネイティブモジュール）
- **Windows** (Windows 10 Build 10240+)
  - BLE Central: ⚠️ (要カスタム実装)
  - BLE Peripheral: ⚠️ (要C++ネイティブモジュール)
  - MIDI Support: ✅

- **macOS** (10.7+)
  - BLE Central: ⚠️ (要カスタム実装)
  - BLE Peripheral: ⚠️ (要Swift/Objective-Cネイティブモジュール)
  - MIDI Support: ✅

### ❌ 未対応
- **iOS** (React Native for Windows/macOSプロジェクトのため除外)
- **Web** (BLEペリフェラル機能制限のため)

## 実行方法

### Android (推奨)
```bash
npm run android
```

### Windows (要追加セットアップ)
```bash
# Windows用セットアップ
npx react-native-windows-init --overwrite --version 0.79.4

# ビルド・実行
npm run windows
```

### macOS (要追加セットアップ)
```bash
# macOS用セットアップ
npx react-native-macos-init --version 0.79.0

# ビルド・実行
npm run macos
```

## プラットフォーム別制限事項

### Android
- **最小API**: 21 (Android 5.0)
- **権限**: 位置情報、Bluetooth
- **最大接続数**: 7デバイス
- **特記事項**: 実機テスト必須

### Windows
- **最小バージョン**: Windows 10 Build 10240
- **要件**: Visual Studio 2019/2022, Windows SDK
- **ネイティブモジュール**: C++ WinRT実装必要
- **最大接続数**: 4デバイス

### macOS
- **最小バージョン**: macOS 10.7+
- **要件**: Xcode, macOS SDK
- **ネイティブモジュール**: Objective-C/Swift実装必要
- **最大接続数**: 8デバイス

## 実装状況

### 実装済み機能
- ✅ Android BLE Central/Peripheral
- ✅ クロスプラットフォーム抽象化層
- ✅ TypeScript型定義
- ✅ MIDI over BLE プロトコル
- ✅ 仮想楽器エンジン
- ✅ リアルタイムMIDIログ

### 要実装機能 (Windows/macOS)
- ⚠️ Windows C++ ネイティブモジュール
- ⚠️ macOS Objective-C ネイティブモジュール
- ⚠️ プラットフォーム別ビルド設定
- ⚠️ 権限処理の最適化

## 優先開発順序

1. **Android完全対応** ✅
2. **Windows基本対応** 🔧
3. **macOS基本対応** 🔧
4. **ネイティブモジュール実装** ⏳
5. **クロスプラットフォーム最適化** ⏳

現在はAndroidが最も安定して動作します。