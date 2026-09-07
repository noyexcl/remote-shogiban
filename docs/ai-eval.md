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

# UI

AIによる解析の情報は将棋盤の下に、下記のようなデザインで表示する
まず最初に最善手(multipv 1)の手を表示し、その後に()をつけて評価値を表示する
更にその後ろには評価値バーを表示する
バーは左右の極限を+2000/-2000として表示する
その下には最大3つまで、全ての候補手とその読み筋を表示する
読み筋は１行で表示し、表示しきれないものは省略する
この解析コンポーネントの横サイズは固定で、上の盤の横サイズと一致するようにする

+-------------------------------+
| ７六歩 (+100) |=======|=====|  |  <- フォント大きめ
| 1 ７六歩 ３四歩...              | 
| 2 ２六歩 ８四歩...              |
| 3 ７八金 ８四歩...              |
+-------------------------------+

