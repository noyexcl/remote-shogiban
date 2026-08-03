import type { Player } from "./shogi";

/** Score information from the engine */
export interface EvalScore {
    type: "cp" | "mate";
    value: number;
}

/** APIの評価値は手番側視点。先手視点に揃えるため後手番では符号を反転する */
export function toSentePerspective(score: EvalScore, teban: Player): EvalScore {
    if (teban !== "Gote") return score;
    return { ...score, value: -score.value };
}

/** SSE event data for a single info line from the engine */
export interface EvalInfo {
    depth?: number;
    score?: EvalScore;
    pv?: string[];
    nodes?: number;
    nps?: number;
}
