import { useMemo } from 'react';
import type { EvalInfo, EvalScore } from '../models/eval';
import { toSentePerspective } from '../models/eval';
import type { Kyokumen } from '../models/shogi';
import { formatPV } from '../util';

interface EvalBarProps {
    kyokumen: Kyokumen;
    info: EvalInfo | null;
    isAnalyzing: boolean;
}

const EVAL_CONTAINER_STYLE = "w-[200px] bg-white border border-[#ccc] p-3 flex flex-col gap-2 max-sm:w-full";
const EVAL_HEADER_STYLE = "text-sm text-stone-500 font-bold flex items-center justify-between";
const EVAL_HEADER_ANALYZING_STYLE = "text-xs text-indigo-500 font-bold";
const BAR_CONTAINER_STYLE = "relative h-4 w-full bg-stone-200 rounded-sm overflow-hidden";
const BAR_FILL_STYLE = "absolute top-0 bottom-0 transition-all";
const CENTER_MARK_STYLE = "absolute top-0 bottom-0 left-1/2 w-px bg-stone-500";
const SCORE_STYLE = "text-lg font-bold";
const META_STYLE = "text-xs text-stone-400";
const PV_STYLE = "text-xs text-stone-600 break-all leading-relaxed";
const PV_INDEX_STYLE = "text-stone-400";

export const EvalBar = ({ kyokumen, info, isAnalyzing }: EvalBarProps) => {
    const score = info?.score ?? null;
    const displayScore = score ? toSentePerspective(score, kyokumen.teban) : null;

    const barPercent = displayScore ? scoreToBarPercent(displayScore) : 50;

    const pvMoves = useMemo(() => {
        if (!info?.pv) return [];
        try {
            return formatPV(info.pv, kyokumen);
        } catch {
            return info.pv;
        }
    }, [info, kyokumen]);

    const metaText = [];
    if (info?.depth !== undefined) metaText.push(`depth ${info.depth}`);
    if (info?.nodes !== undefined) metaText.push(`nodes ${info.nodes}`);
    if (info?.nps !== undefined) metaText.push(`nps ${info.nps}`);

    return (
        <div className={EVAL_CONTAINER_STYLE}>
            <div className={EVAL_HEADER_STYLE}>
                <span>AI評価</span>
                {isAnalyzing && <span className={EVAL_HEADER_ANALYZING_STYLE}>解析中...</span>}
            </div>

            <div className={BAR_CONTAINER_STYLE}>
                <div className={CENTER_MARK_STYLE} />
                {barPercent < 50 && (
                    <div className={`${BAR_FILL_STYLE} ${barColorClass(displayScore)}`} style={{ left: `${barPercent}%`, right: '50%' }} />
                )}
                {barPercent >= 50 && (
                    <div className={`${BAR_FILL_STYLE} ${barColorClass(displayScore)}`} style={{ left: '50%', right: `${100 - barPercent}%` }} />
                )}
            </div>

            <div className={`${SCORE_STYLE} ${scoreClass(displayScore)}`}>
                {displayScore ? formatScoreText(displayScore) : "未解析"}
            </div>

            <div className={META_STYLE}>
                {metaText.join(' · ')}
            </div>

            {pvMoves.length > 0 && (
                <div className={PV_STYLE}>
                    {pvMoves.map((m, i) => (
                        <span key={i}>
                            <span className={PV_INDEX_STYLE}>{i + 1}:</span> {m}
                            {i < pvMoves.length - 1 && ' '}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

/** 先手視点の評価値をバーの左端からの位置(%)に変換する */
function scoreToBarPercent(score: EvalScore): number {
    if (score.type === "mate") {
        return score.value > 0 ? 100 : 0;
    }
    const clamped = Math.max(-2000, Math.min(2000, score.value));
    return 50 + (clamped / 2000) * 50;
}

function formatScoreText(score: EvalScore): string {
    if (score.type === "mate") {
        return score.value > 0
            ? `先手まで ${score.value} 手`
            : `後手まで ${Math.abs(score.value)} 手`;
    }
    const value = Math.round(score.value);
    return value > 0 ? `+${value}` : `${value}`;
}

function scoreClass(score: EvalScore | null): string {
    if (!score) return "text-stone-400";
    return score.value >= 0 ? "text-red-600" : "text-blue-600";
}

function barColorClass(score: EvalScore | null): string {
    return score !== null && score.value < 0 ? "bg-blue-500" : "bg-red-500";
}

export default EvalBar;
