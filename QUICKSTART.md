# 🚀 BLE MIDI Simulator - クイックスタートガイド

**5分で始める！BLE MIDI Simulator v1.0.0**

## ⚡ 最速セットアップ

### 1. インストール（30秒）
```bash
# Git クローン
git clone https://github.com/[username]/ble-midi-simulator.git
cd ble-midi-simulator

# 依存関係インストール
npm install

# 開発モード起動
npm run electron:dev
```

### 2. 基本使用（2分）

#### 🎯 Centralモード（デバイス制御）
1. **「Central」を選択**
2. **「Start Scan」** → デバイス選択 → **「Connect」**
3. **MIDI送信**: Standardまたは高解像度CCスライダーを操作

#### 🎵 Peripheralモード（仮想デバイス）
1. **「Peripheral」を選択**
2. **デバイス名入力** → **「Start Advertising」**
3. **他デバイスから接続可能**

## 🎛️ 主な操作

### MIDI送信方法
```javascript
// 基本CC送信
CC番号: 7 (Volume)
値: 0-127

// 高解像度CC送信
MSB CC: 1 (Modulation)
値: 0-16383 (14ビット)

// 高度MIDI
Note On/Off, Program Change, Pitch Bend, SysEx対応
```

### プリセット活用
1. **「Create Preset」** → 設定保存
2. **「Apply」** → ワンクリック適用
3. **自動復旧**: 接続切断時も安心

### テスト機能
- **Auto Test**: 自動スケール演奏
- **CC Ramp**: 0-127自動変化
- **Custom Test**: 個別メッセージ送信

## 🔧 開発コマンド

```bash
# 🏗️ 開発
npm run electron:dev        # 開発モード（ホットリロード）
npm run dev                 # レンダラーのみ
npm run build:electron      # フルビルド

# 🚀 実行
npm run electron           # プロダクション実行
npm run dist              # インストーラー作成

# 🛠️ ビルド詳細
npm run build:main        # メインプロセス
npm run build:renderer    # レンダラープロセス
```

## 📊 監視・統計

### リアルタイム情報
- **Messages**: 送受信数、レート（msg/s）
- **Connection**: アップタイム、状態
- **Performance**: メモリ使用量、負荷

### 統計パネル
```
┌─ Connection Statistics ─────────────────┐
│ Mode: central          Status: Connected │
│ Uptime: 5m 23s        Device: My Piano  │
│ Messages: 1,247       Rate: 12.3/s      │
│ Memory: 67MB          Load: Normal      │
└─────────────────────────────────────────┘
```

## 🚨 トラブルシューティング

### 🔴 接続できない
```bash
# 1. Bluetooth確認
# Windows設定 > デバイス > Bluetooth

# 2. 権限確認
# Windows設定 > プライバシー > Bluetooth

# 3. アプリ再起動
npm run electron:dev
```

### 🟡 パフォーマンス低下
```javascript
// 統計パネルで確認
Memory: >100MB  → アプリ再起動
Rate: >20msg/s  → 送信間隔調整
Load: High      → バックグラウンドアプリ確認
```

### 🟢 正常動作確認
- ✅ 接続統計で「Connected」表示
- ✅ MIDI送信時にログ表示
- ✅ メモリ使用量 50-70MB

## 💡 プロTips

### 効率的な使用方法
1. **プリセット活用**: よく使う設定を保存
2. **統計監視**: パフォーマンス問題の早期発見
3. **テスト機能**: MIDI機器の動作確認

### 高度な使用例
```typescript
// 1. 高解像度制御
MSB CC: 1, 値: 8192 → 精密モジュレーション

// 2. SysEx送信
F0 7F 7F 04 01 00 7F F7 → システム設定

// 3. シーケンス送信
Auto Test → C Major Scale自動演奏
```

## 🎵 実用例

### 音楽制作での活用
- **DAW制御**: パラメーター自動化
- **ハードウェア制御**: シンセサイザー操作
- **テスト環境**: MIDI機器検証

### ライブパフォーマンス
- **リアルタイム制御**: エフェクト操作
- **バックアップ**: 機器故障時の代替
- **モニタリング**: MIDI通信監視

## 📚 学習リソース

### 基本概念
- **Central vs Peripheral**: 制御者 vs 被制御者
- **BLE MIDI**: Bluetooth Low Energy MIDI仕様
- **CC (Control Change)**: MIDIパラメーター制御

### 詳細ドキュメント
- `README.md`: 完全ガイド
- `docs/electron-implementation-plan.md`: 技術仕様
- `PHASE5_COMPLETION.md`: 機能詳細

---

**🎉 お疲れ様でした！これでBLE MIDI Simulatorを最大限活用できます。**

**💬 質問・フィードバックはGitHub Issuesまでお気軽に！**