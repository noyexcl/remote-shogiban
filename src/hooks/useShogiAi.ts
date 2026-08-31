import { useState, useCallback, useRef } from 'react';
import { streamEval } from '../api/aiClient';
import type { Kyokumen } from '../models/shogi';
import type { EvalInfo } from '../models/eval';

/**
 * 将棋AIによる検討機能を提供するカスタムフック
 */
export const useShogiAi = () => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<EvalInfo[]>([]);
    const [latestInfo, setLatestInfo] = useState<EvalInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    /**
     * 指定された局面をAIに検討させる
     * @param kyokumen 検討対象の局面
     * @returns 受信した評価情報の配列
     */
    const analyze = useCallback(async (kyokumen: Kyokumen): Promise<EvalInfo[]> => {
        abortControllerRef.current?.abort();

        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsAnalyzing(true);
        setError(null);
        setResult([]);
        setLatestInfo(null);

        // multipv ごとに最新の情報を保持し、最善候補(multipv=1)のみを表示するために使う
        const byMultiPv = new Map<number, EvalInfo>();

        const pickBest = (map: Map<number, EvalInfo>): EvalInfo | null => {
            if (map.size === 0) return null;
            const bestKey = Math.min(...map.keys());
            return map.get(bestKey) ?? null;
        };

        try {
            for await (const info of streamEval(kyokumen, controller.signal)) {
                const key = info.multipv ?? 1;
                byMultiPv.set(key, info);
                const sorted = [...byMultiPv.values()].sort(
                    (a, b) => (a.multipv ?? 1) - (b.multipv ?? 1),
                );
                setResult(sorted);
                setLatestInfo(pickBest(byMultiPv));
            }
            return [...byMultiPv.values()].sort(
                (a, b) => (a.multipv ?? 1) - (b.multipv ?? 1),
            );
        } catch (err) {
            if (!controller.signal.aborted) {
                const message = err instanceof Error ? err.message : 'AI検討中にエラーが発生しました';
                setError(message);
                throw err;
            }
        } finally {
            if (abortControllerRef.current === controller) {
                setIsAnalyzing(false);
            }
        }

        return [...byMultiPv.values()].sort(
            (a, b) => (a.multipv ?? 1) - (b.multipv ?? 1),
        );
    }, []);

    /**
     * 検討状態をリセットする
     */
    const clear = useCallback(() => {
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        setIsAnalyzing(false);
        setResult([]);
        setLatestInfo(null);
        setError(null);
    }, []);

    return {
        analyze,
        clear,
        isAnalyzing,
        result,
        latestInfo,
        error
    };
};
