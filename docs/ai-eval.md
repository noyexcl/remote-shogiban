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
    /** MultiPV設定時の候補手番号 (1=最善手)。単一候補時はエンジンから送られない場合がある */
    multipv?: number;
    depth?: number;
    score?: EvalScore;
    pv?: string[];
    nodes?: number;
    nps?: number;
}
```
