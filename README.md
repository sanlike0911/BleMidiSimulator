# BLE MIDI Simulator v1.0.0

**プロフェッショナル対応のBLE MIDI デュアルモードアプリケーション**

BLE MIDI Simulatorは、Bluetooth Low Energy (BLE) MIDI デバイスとの双方向通信を可能にする高機能なElectronアプリケーションです。CentralモードとPeripheralモードの両方をサポートし、音楽制作環境での本格的な使用に対応しています。

## 🎵 主な機能

### 🔄 デュアルモード対応
- **Centralモード**: BLE MIDIデバイスに接続して制御
- **Peripheralモード**: 他のデバイスから接続される仮想MIDIデバイスとして動作
- **ワンクリック切替**: モード間の即座切り替え

### 🎼 高度なMIDI機能
- **7種類のMIDIメッセージ**: Note On/Off, CC, Program Change, Pitch Bend, Aftertouch, SysEx, MIDI Clock
- **高解像度CC**: 14ビット（0-16383）Control Change対応
- **BLE MIDI準拠**: 完全なBLE MIDIプロトコル実装
- **リアルタイム通信**: 低遅延MIDI送受信

### 🔧 プロ仕様機能
- **自動再接続**: 接続切断時の自動復旧（5秒間隔、最大3回）
- **設定プリセット**: デバイス設定の保存・読込
- **接続統計**: リアルタイム通信監視
- **テスト機能**: 自動MIDI送信・検証機能

### 📊 監視・統計
- **リアルタイム統計**: 送受信レート、メッセージ数
- **パフォーマンス監視**: メモリ使用量、処理負荷
- **接続状態表示**: 詳細な接続情報とステータス

## 🚀 インストール方法

### システム要件
- **OS**: Windows 10/11 (x64)
- **Bluetooth**: Bluetooth 4.0以降対応アダプター
- **メモリ**: 4GB RAM以上推奨
- **ストレージ**: 200MB以上の空き容量

### Option 1: リリース版インストール（推奨）

1. **リリースページからダウンロード**
   ```
   https://github.com/[username]/ble-midi-simulator/releases/latest
   ```

2. **インストーラー実行**
   - `BLE-MIDI-Simulator-Setup-1.0.0.exe` をダウンロード
   - インストーラーを実行してセットアップ完了

3. **アプリケーション起動**
   - スタートメニューから「BLE MIDI Simulator」を選択
   - またはデスクトップショートカットをダブルクリック

### Option 2: ソースからビルド

#### 1. 前提条件
```bash
# Node.js (18.0.0以降)
node --version

# npm または yarn
npm --version
```

#### 2. リポジトリクローン
```bash
git clone https://github.com/[username]/ble-midi-simulator.git
cd ble-midi-simulator
```

#### 3. 依存関係インストール
```bash
npm install
```

#### 4. 開発モード起動
```bash
# 開発サーバー起動（ホットリロード対応）
npm run electron:dev
```

#### 5. プロダクションビルド
```bash
# アプリケーションビルド
npm run build:electron

# プロダクション実行
npm run electron
```

#### 6. インストーラー作成
```bash
# Windows インストーラー作成
npm run dist
```

## 🎯 使用方法

### 基本操作

#### 1. アプリケーション起動
- デスクトップアイコンまたはスタートメニューから起動
- 初回起動時にBluetooth権限を許可

#### 2. モード選択
- **Centralモード**: デバイスに接続して制御
- **Peripheralモード**: 仮想MIDIデバイスとして動作

### Centralモード（デバイス制御）

#### デバイス接続
1. **「Central」モードを選択**
2. **「Start Scan」をクリック** してデバイス検索
3. **デバイス一覧から選択** して「Connect」
4. **接続完了** - ステータスが「Connected」に変更

#### MIDI送信
1. **Standard CC**: 7ビット制御（0-127）
2. **High-Res CC**: 14ビット制御（0-16383）
3. **Advanced Sender**: 全MIDIメッセージタイプ対応

### Peripheralモード（仮想デバイス）

#### 広告開始
1. **「Peripheral」モードを選択**
2. **デバイス名を入力**（例：「My MIDI Controller」）
3. **「Start Advertising」をクリック**
4. **他のデバイスから接続可能**

#### 接続管理
- 接続済みデバイス一覧表示
- 個別切断機能
- リアルタイム活動状況

### 高度な機能

#### デバイスプリセット
1. **「Create Preset」** で新規プリセット作成
2. **設定保存**: モード、デバイス名、MIDIマッピング
3. **「Apply」** でワンクリック適用

#### 自動テスト機能
1. **「MIDI Tester」** セクション
2. **Auto Test** でスケール自動演奏
3. **Custom Test** で任意メッセージ送信

#### 接続統計
- **Messages**: 送受信数、レート
- **Performance**: メモリ、CPU使用量
- **Connection**: アップタイム、状態

## 🔧 開発者向け情報

### プロジェクト構成
```
src/
├── main/                    # Electronメインプロセス
│   ├── bluetooth/          # Bluetooth管理
│   │   ├── central-manager.ts
│   │   ├── peripheral-manager.ts
│   │   └── mode-controller.ts
│   ├── ipc/                # IPC通信ハンドラー
│   └── index.ts            # メインエントリーポイント
├── renderer/               # レンダラープロセス（React UI）
│   ├── components/         # UIコンポーネント
│   ├── hooks/              # Reactフック
│   └── App.tsx             # メインアプリケーション
└── shared/                 # 共通型定義・定数
    ├── types.ts
    └── constants.ts
```

### 開発コマンド
```bash
# 開発サーバー起動
npm run dev

# Electronメインプロセスビルド
npm run build:main

# レンダラープロセスビルド
npm run build:renderer

# 完全ビルド
npm run build:electron

# 開発モード起動
npm run electron:dev

# プロダクション起動
npm run electron

# インストーラー作成
npm run dist
```

### API仕様

#### IPC通信
```typescript
// モード切替
await window.electronAPI.mode.switchTo('central' | 'peripheral')

// Central操作
await window.electronAPI.central.startScan(nameFilter?)
await window.electronAPI.central.connect(deviceId)
await window.electronAPI.central.disconnect()

// Peripheral操作
await window.electronAPI.peripheral.startAdvertising(deviceName)
await window.electronAPI.peripheral.stopAdvertising()

// MIDI送信
await window.electronAPI.midi.sendMessage(message: Uint8Array)
```

#### イベントリスナー
```typescript
// 接続状態変更
window.electronAPI.on('bluetooth:connected', (device) => {})
window.electronAPI.on('bluetooth:disconnected', () => {})

// MIDI受信
window.electronAPI.on('midi:messageReceived', (message) => {})

// モード変更
window.electronAPI.on('mode:changed', (mode) => {})
```

## 🛠️ トラブルシューティング

### よくある問題

#### Bluetoothが認識されない
1. **Bluetoothアダプターの確認**
   - デバイスマネージャーでBluetooth確認
   - ドライバー更新

2. **権限設定**
   - Windows設定 > プライバシー > Bluetooth
   - アプリがBluetoothにアクセスできることを確認

#### 接続が失敗する
1. **デバイス状態確認**
   - MIDIデバイスがペアリングモード
   - 他のアプリで使用されていない

2. **アプリ再起動**
   - アプリケーション完全終了
   - 再起動後に再接続

#### パフォーマンス問題
1. **メモリ使用量確認**
   - 接続統計でメモリ監視
   - 必要に応じてアプリ再起動

2. **MIDI送信レート調整**
   - 高頻度送信の場合は間隔調整
   - バッファオーバーフロー回避

### ログ確認
```bash
# 開発モードでのコンソール確認
npm run electron:dev
# Chrome DevToolsでログ確認
```

## 📞 サポート

### コミュニティ
- **GitHub Issues**: バグ報告・機能要求
- **Discussions**: 質問・アイデア共有

### ドキュメント
- `docs/` フォルダ内の詳細ドキュメント
- `PHASE5_COMPLETION.md`: 機能詳細
- `docs/electron-implementation-plan.md`: 技術仕様

## 📜 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は`LICENSE`ファイルを参照してください。

## 🙏 謝辞

- **@abandonware/noble**: Central Bluetooth機能
- **bleno**: Peripheral Bluetooth機能
- **Electron**: デスクトップアプリケーション基盤
- **React**: ユーザーインターフェース
- **TypeScript**: 型安全性

## 📋 更新履歴

### v1.0.0 (2025-09-19)
- 🎉 初回リリース
- ✅ Central/Peripheralデュアルモード
- ✅ 7種類MIDIメッセージサポート
- ✅ 自動再接続・設定プリセット
- ✅ リアルタイム統計・監視機能

---

**BLE MIDI Simulator v1.0.0** - プロフェッショナル音楽制作のための次世代BLE MIDIツール