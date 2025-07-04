# 相続税計算アプリ（Next.js版）

日本の相続税計算に対応したモダンなWebアプリケーションです。法定相続人の判定から相続税の計算、2割加算・配偶者税額軽減の適用まで、正確で簡単な相続税計算をサポートします。

## 🚀 特徴

### 📊 包括的な相続税計算
- **法定相続人の自動判定**: 配偶者、子供、親、兄弟姉妹の複雑な関係を正確に処理
- **基礎控除の自動計算**: 3,000万円 + 600万円 × 法定相続人数
- **相続税率の自動適用**: 累進税率による正確な税額計算
- **2割加算の適用**: 法定相続人以外への自動適用
- **配偶者税額軽減**: 1億6千万円または法定相続分相当額の控除

### 🎯 実際の分割計算
- **金額指定**: 具体的な相続額での分割計算
- **割合指定**: パーセンテージでの分割計算
- **リアルタイム計算**: 入力と同時に税額を自動更新

### 🎨 2025年最新UI/UX
- **レスポンシブデザイン**: デスクトップ・モバイル対応
- **直感的な操作**: タブ形式の分かりやすいインターフェース
- **美しいビジュアル**: Shadcn/UIによるモダンなデザイン
- **アクセシビリティ**: 誰でも使いやすい設計

## 🛠️ 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **UIコンポーネント**: Shadcn/UI
- **アイコン**: Lucide React
- **デプロイ**: Vercel

## 📦 セットアップ

### 前提条件
- Node.js 18.0以上
- npm または yarn

### インストール手順

1. **リポジトリをクローン**
   ```bash
   git clone <repository-url>
   cd inheritance-tax-calculator-nextjs
   ```

2. **依存関係をインストール**
   ```bash
   npm install
   # または
   yarn install
   ```

3. **開発サーバーを起動**
   ```bash
   npm run dev
   # または
   yarn dev
   ```

4. **ブラウザでアクセス**
   ```
   http://localhost:3000
   ```

## 🚀 デプロイ

### Vercelでのデプロイ

1. **Vercel CLIをインストール**
   ```bash
   npm i -g vercel
   ```

2. **デプロイを実行**
   ```bash
   vercel
   ```

3. **本番環境へのデプロイ**
   ```bash
   vercel --prod
   ```

## 📖 使用方法

### 1. 家族構成入力
- 課税価格を入力
- 配偶者の有無を選択
- 子供の数（養子・孫養子含む）を入力
- 親の生存状況を選択
- 兄弟姉妹の数を入力
- 法定相続人以外の人数を入力

### 2. 計算結果確認
- 課税遺産総額の確認
- 基礎控除額の確認
- 相続税総額の確認
- 各相続人の法定相続分と税額の確認

### 3. 実際の分割計算
- **金額指定**: 具体的な相続額を入力
- **割合指定**: パーセンテージで分割比率を指定
- 配偶者税額軽減の自動適用
- 2割加算の自動計算

## 🧮 計算ロジック

### 基礎控除額
```
基礎控除額 = 3,000万円 + 600万円 × 法定相続人数
```

### 相続税の計算
1. 課税遺産総額 = 課税価格 - 基礎控除額
2. 法定相続分による仮計算
3. 累進税率の適用
4. 実際の分割による按分計算
5. 配偶者税額軽減の適用
6. 2割加算の適用

### 配偶者税額軽減
```
軽減限度額 = max(1億6千万円, 配偶者の法定相続分相当額)
```

## 🔧 API エンドポイント

- `POST /api/calculation/heirs` - 法定相続人判定
- `POST /api/calculation/tax-amount` - 相続税額計算
- `POST /api/calculation/actual-division` - 実際の分割計算

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🤝 貢献

プルリクエストや課題報告を歓迎します。大きな変更を行う前に、まず課題を開いて変更内容について議論してください。

## ⚠️ 免責事項

この計算結果は参考値です。実際の税務申告においては税理士等の専門家にご相談ください。

---

**相続税計算アプリ v2.0.0 | 2025年6月30日版 | Next.js 15 + TypeScript**

