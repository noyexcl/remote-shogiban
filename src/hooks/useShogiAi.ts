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

        const infos: EvalInfo[] = [];

        try {
            for await (const info of streamEval(kyokumen, controller.signal)) {
                infos.push(info);
                setResult([...infos]);
                setLatestInfo(info);
            }
            return infos;
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

        return infos;
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
