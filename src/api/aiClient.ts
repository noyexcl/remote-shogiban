import type { Kyokumen } from '../models/shogi';
import type { EvalInfo } from '../models/eval';

/**
 * 将棋AIエンジンに対して局面の検討をリクエストし、SSEストリームから評価情報を返す
 *
 * EventSourceはPOSTリクエストを送信できないため、fetch + ReadableStreamでSSEをパースする
 *
 * @param kyokumen 検討対象の局面
 * @param signal キャンセル用のAbortSignal
 * @yields エンジンから送られてくる評価情報 (EvalInfo)
 */
export async function* streamEval(kyokumen: Kyokumen, signal?: AbortSignal): AsyncGenerator<EvalInfo> {
    const sfen = kyokumen.toSFEN();

    const response = await fetch('/api/ai/eval', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sfen }),
        signal,
    });

    if (!response.ok) {
        throw new Error(`AIサーバーエラー: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
        throw new Error('AIサーバーからのレスポンスがストリームに対応していません');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            let boundary = buffer.indexOf('\n\n');
            while (boundary !== -1) {
                const rawEvent = buffer.slice(0, boundary);
                buffer = buffer.slice(boundary + 2);

                const data = parseSSEEventData(rawEvent);
                if (data !== null) {
                    try {
                        console.log(data)
                        yield JSON.parse(data) as EvalInfo;
                    } catch {
                        // 不正なJSONは無視する
                    }
                }

                boundary = buffer.indexOf('\n\n');
            }
        }

        // \n\n なしでストリームが終了した場合の最後のイベントを処理する
        if (buffer.trim() !== '') {
            const data = parseSSEEventData(buffer);
            if (data !== null) {
                try {
                    yield JSON.parse(data) as EvalInfo;
                } catch {
                    // 不正なJSONは無視する
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}

/** SSEイベントから data: 行の内容を取り出す (data: 行が無ければ null) */
function parseSSEEventData(rawEvent: string): string | null {
    let data: string | null = null;

    for (const rawLine of rawEvent.split('\n')) {
        const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
        if (line.startsWith('data:')) {
            const value = line.slice(5).trimStart();
            data = data === null ? value : `${data}\n${value}`;
        }
    }

    return data;
}
