# 仕様

/api/ai/eval に body に sfen="<sfen>" をセットしてPOST リクエストすることで局面を評価させることが出来る

レスポンスとして SSE が開かれ、以下のような usi プロトコルの info コマンドの情報が json 形式で送られてくる

```ts
/** Score information from the engine */
export interface EvalScore {
    type: "cp" | "mate";
    value: number;
}

/** SSE event data for a single info line from the engine */
export interface EvalInfo {
    depth?: number;
    score?: EvalScore;
    pv?: string[];
    nodes?: number;
    nps?: number;
}
```

# 実装計画

## 1. 型定義 — `src/models/eval.ts` (新規)

`EvalScore` と `EvalInfo` を定義し export する。

```ts
export interface EvalScore {
    type: "cp" | "mate";
    value: number;
}

export interface EvalInfo {
    depth?: number;
    score?: EvalScore;
    pv?: string[];
    nodes?: number;
    nps?: number;
}
```

## 2. API クライアント改修 — `src/api/aiClient.ts`

- SSE ストリーミング対応: `fetch` + `ReadableStream` で SSE をパース (EventSource は POST 不可なため)
- `AsyncGenerator<EvalInfo>` を返す or コールバック `onInfo` + `AbortSignal` でキャンセル可能にする
- パース処理: `\n` で分割 → `data: {...}` 行を JSON.parse → `EvalInfo` として yield

## 3. フック改修 — `src/hooks/useShogiAi.ts`

- `analyze(kyokumen)` でストリーミング開始、`EvalInfo[]` を蓄積
- `AbortController` で新たな解析時に古いリクエストをキャンセル
- 公開状態:
  - `isAnalyzing: boolean`
  - `result: EvalInfo[]` — 全受信データ
  - `latestInfo: EvalInfo | null` — 最新の評価情報
  - `error: string | null`
- `clear()` で状態リセット

## 4. 評価表示コンポーネント — `src/components/EvalBar.tsx` (新規)

Props: `info: EvalInfo | null`, `isAnalyzing: boolean`

レイアウト:
- 評価値を可視化する水平バー (cp → -1000..+1000 を位置にマッピング, mate → 詰み手数)
- 評価値テキスト: `+123` (先手優勢) / `-123` (後手優勢) / `Mate in N`
- Depth / Nodes / NPS をバー下に表示
- PV (読み筋) を日本語棋譜表記で表示 (USI → 棋譜 notation, 既存の `fmtSashite` 相当のロジックを流用)
- 盤面と棋譜リストの横 or 下に固定表示 (display-only)

## 5. ShogiBan への組み込み — `src/components/ShogiBan.tsx`

- `EvalBar` を import
- `useShogiAi` から `latestInfo` と `isAnalyzing` を取得
- 盤面の下に `EvalBar` を常時表示 (fixed, display-only)

## 6. テスト

- `src/models/shogi.test.ts`: SFEN シリアライズのテストを追加
- `src/api/aiClient.test.ts` (新規): モック SSE ストリームでパーサーのテスト
