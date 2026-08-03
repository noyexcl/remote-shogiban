import { getFromRow } from "./models/shogi"
import type { KomaKind, Kyokumen, Player } from "./models/shogi"

export function getKomaImageUrl(kind: KomaKind, reversed: boolean, owner?: Player): string {
    let name = '';
    switch (kind) {
        case 'FU': name = 'fu'; break;
        case 'KY': name = 'kyo'; break;
        case 'KE': name = 'kei'; break;
        case 'GI': name = 'gin'; break;
        case 'KI': name = 'kin'; break;
        case 'KA': name = 'kaku'; break;
        case 'HI': name = 'hi'; break;
        case 'OU': name = (owner === 'Gote') ? 'gyoku' : 'ou'; break;
        case 'FU+': name = 'to'; break;
        case 'KY+': name = 'nari_kyo'; break;
        case 'KE+': name = 'nari_kei'; break;
        case 'GI+': name = 'nari_kin'; break;
        case 'KA+': name = 'uma'; break;
        case 'HI+': name = 'ryu'; break;
        default: name = 'fu';
    }

    const suffix = reversed ? '_rev' : '';
    return `${import.meta.env.BASE_URL}koma/${name}${suffix}.png`;
}

/**
 * USI形式の読み筋(pv)を日本語棋譜表記に変換する
 *
 * @param pv USI形式の指し手のリスト (例: ["7g7f", "3c3d"])
 * @param kyokumen pvを適用していく開始局面
 * @returns 日本語棋譜表記の指し手のリスト (例: ["７六歩", "３四歩"])
 */
export function formatPV(pv: string[], kyokumen: Kyokumen): string[] {
    const moves: string[] = [];
    let current = kyokumen;

    for (const usi of pv) {
        const move = parseUSIMove(usi, current);
        moves.push(move.japanese);
        current = current.move(move.fromRow, move.fromCol, move.toRow, move.toCol, move.promote);
    }

    return moves;
}

interface ParsedUSIMove {
    fromRow: number;
    fromCol: number;
    toRow: number;
    toCol: number;
    promote: boolean;
    japanese: string;
}

/** USI形式の指し手をパースし、対象の駒と移動先を日本語表記とともに返す */
function parseUSIMove(usi: string, kyokumen: Kyokumen): ParsedUSIMove {
    let body = usi;
    let promote = false;
    if (body.endsWith('+')) {
        promote = true;
        body = body.slice(0, -1);
    }

    const toRow = body.charCodeAt(body.length - 1) - 97;
    const toCol = 9 - Number(body[body.length - 2]);

    let komaKind: KomaKind;
    let fromRow: number;
    let fromCol: number;

    if (body[1] === '*') {
        // 駒打ち (例: B*4d)
        komaKind = usiPieceToKomaKind(body[0]);
        fromRow = getFromRow(komaKind, kyokumen.teban);
        fromCol = 0;
        promote = false;
    } else {
        fromRow = body.charCodeAt(1) - 97;
        fromCol = 9 - Number(body[0]);
        const koma = kyokumen.ban[fromRow][fromCol];
        if (!koma) {
            throw new Error(`PVの指し手に対応する駒が見つかりません: ${usi}`);
        }
        komaKind = koma.kind;
    }

    return {
        fromRow,
        fromCol,
        toRow,
        toCol,
        promote,
        japanese: formatMoveToJapanese(komaKind, toCol, toRow, promote),
    };
}

function formatMoveToJapanese(komaKind: KomaKind, toCol: number, toRow: number, promote: boolean): string {
    const suji = 9 - toCol;
    const dan = toRow + 1;
    return `${sujiToJapanese(suji)}${danToJapanese(dan)}${komaKindToJapanese(komaKind)}${promote ? "成" : ""}`;
}

function sujiToJapanese(suji: number): string {
    return ["１", "２", "３", "４", "５", "６", "７", "８", "９"][suji - 1] ?? "";
}

function danToJapanese(dan: number): string {
    return ["一", "二", "三", "四", "五", "六", "七", "八", "九"][dan - 1] ?? "";
}

function komaKindToJapanese(kind: KomaKind): string {
    switch (kind) {
        case "OU": return "玉";
        case "HI": return "飛";
        case "KA": return "角";
        case "KI": return "金";
        case "GI": return "銀";
        case "KE": return "桂";
        case "KY": return "香";
        case "FU": return "歩";
        case "FU+": return "と";
        case "KY+": return "成香";
        case "KE+": return "成桂";
        case "GI+": return "成銀";
        case "KA+": return "馬";
        case "HI+": return "竜";
    }
}

function usiPieceToKomaKind(letter: string): KomaKind {
    switch (letter.toUpperCase()) {
        case "K": return "OU";
        case "R": return "HI";
        case "B": return "KA";
        case "G": return "KI";
        case "S": return "GI";
        case "N": return "KE";
        case "L": return "KY";
        case "P": return "FU";
        default: throw new Error(`不正な駒文字です: ${letter}`);
    }
}
