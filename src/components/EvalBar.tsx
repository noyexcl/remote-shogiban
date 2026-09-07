import { useMemo } from 'react';
import type { EvalInfo, EvalScore } from '../models/eval';
import { toSentePerspective } from '../models/eval';
import type { Kyokumen } from '../models/shogi';
import { formatPV } from '../util';

interface EvalBarProps {
    kyokumen: Kyokumen;
    // multipv順にソート済みの評価情報。最大3件まで表示する
    infos: EvalInfo[];
    isAnalyzing: boolean;
}

// 将棋盤の下に置く横長パネル。幅は固定で、上の盤行(駒台+盤+駒台)と一致させる。
// 幅の内訳: 駒台120px×2 + 盤574px(9×60+gap8+p20+border6) + 行gap16 = 830px。
// truncateによる1行省略を効かせるには幅確定が必須のため、内容物追従のw-fullではなく固定幅にする。
// 狭い画面ではmax-w-fullでビューポート幅に頭打ちする。盤・駒台のサイズ変更時はこの幅も再計算すること
const EVAL_CONTAINER_STYLE = "w-[830px] max-w-full bg-white border border-[#ccc] p-3 flex flex-col gap-2 overflow-hidden";
// 仕様の1行目: 最善手 (+評価値) バー。フォント大きめ
const BEST_ROW_STYLE = "flex items-center gap-3 text-xl font-bold";
const BEST_MOVE_STYLE = "whitespace-nowrap";
const SCORE_TEXT_STYLE = "whitespace-nowrap";
const BAR_CONTAINER_STYLE = "relative h-4 flex-1 bg-stone-200 rounded-sm overflow-hidden";
const BAR_FILL_STYLE = "absolute top-0 bottom-0 transition-all";
const CENTER_MARK_STYLE = "absolute top-0 bottom-0 left-1/2 w-px bg-stone-500";
const ANALYZING_STYLE = "text-xs text-indigo-500 font-bold whitespace-nowrap";
// 候補手の読み筋一覧。PV全手をDOMに残し、1行に収まらない分はCSS(truncate)で省略表示する
const PV_LIST_STYLE = "flex flex-col gap-1 text-sm text-stone-600 min-w-0";
// truncate(=nowrap+ellipsis)で1行省略表示する。min-w-0でflexカラム内でも省略が有効に働く
const PV_LINE_STYLE = "block w-full min-w-0 truncate leading-relaxed";
const PV_INDEX_STYLE = "text-stone-400 mr-1";
const EMPTY_STYLE = "text-stone-400";

export const EvalBar = ({ kyokumen, infos, isAnalyzing }: EvalBarProps) => {
    // multipv欠落(=単PV時)は1として扱う
    const sorted = useMemo(
        () => [...infos].sort((a, b) => (a.multipv ?? 1) - (b.multipv ?? 1)).slice(0, 3),
        [infos],
    );
    const best = sorted.find((info) => (info.multipv ?? 1) === 1) ?? sorted[0] ?? null;

    const displayScore = best?.score ? toSentePerspective(best.score, kyokumen.teban) : null;
    const barPercent = displayScore ? scoreToBarPercent(displayScore) : 50;

    // 1行目の最善手(読み筋の先頭1手)を日本語表記に変換する
    const bestMoveText = useMemo(() => {
        if (!best?.pv || best.pv.length === 0) return null;
        try {
            return formatPV(best.pv.slice(0, 1), kyokumen)[0] ?? null;
        } catch {
            return best.pv[0];
        }
    }, [best, kyokumen]);

    // 候補行ごとの読み筋を日本語表記に変換する(全手表示。はみ出し分の省略はCSS側で行う)
    const candidateLines = useMemo(
        () =>
            sorted.map((info) => {
                if (!info.pv || info.pv.length === 0) return [];
                try {
                    return formatPV(info.pv, kyokumen);
                } catch {
                    return info.pv;
                }
            }),
        [sorted, kyokumen],
    );

    return (
        <div className={EVAL_CONTAINER_STYLE}>
            <div className={BEST_ROW_STYLE}>
                {best && bestMoveText && displayScore ? (
                    <>
                        <span className={BEST_MOVE_STYLE}>{bestMoveText}</span>
                        <span className={`${SCORE_TEXT_STYLE} ${scoreClass(displayScore)}`}>
                            ({formatScoreText(displayScore)})
                        </span>
                    </>
                ) : (
                    <span className={EMPTY_STYLE}>未解析</span>
                )}
                {isAnalyzing && <span className={ANALYZING_STYLE}>解析中...</span>}
                <div className={BAR_CONTAINER_STYLE}>
                    <div className={CENTER_MARK_STYLE} />
                    {barPercent < 50 && (
                        <div className={`${BAR_FILL_STYLE} ${barColorClass(displayScore)}`} style={{ left: `${barPercent}%`, right: '50%' }} />
                    )}
                    {barPercent >= 50 && (
                        <div className={`${BAR_FILL_STYLE} ${barColorClass(displayScore)}`} style={{ left: '50%', right: `${100 - barPercent}%` }} />
                    )}
                </div>
            </div>

            <div className={PV_LIST_STYLE}>
                {sorted.map((info, i) => (
                    <div key={info.multipv ?? i} className={PV_LINE_STYLE}>
                        <span className={PV_INDEX_STYLE}>{info.multipv ?? i + 1}</span>
                        {candidateLines[i].length > 0 ? candidateLines[i].join(' ') : '—'}
                    </div>
                ))}
            </div>
        </div>
    );
};

/** 先手視点の評価値をバーの左端からの位置(%)に変換する。極限は+2000/-2000 */
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
