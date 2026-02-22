import { produce } from "immer";

export type Masu = Koma | null;

export type KomaDai = Record<Exclude<KomaKind, "FU+" | "KY+" | "KE+" | "GI+" | "KA+" | "HI+">, number>;

export type KomaKind = "FU" | "KY" | "KE" | "GI" | "KI" | "KA" | "HI" | "OU"
    | "FU+" | "KY+" | "KE+" | "GI+" | "KA+" | "HI+";

export type Player = "Sente" | "Gote";

export type Koma = {
    kind: KomaKind;
    owner: Player;
    promoted: boolean;
};

/**
 * fromRow == -255 represents 0手目, which actually does nothing (even teban will not be changed). \
 * 
 * fromRow == -1~-7 represents a move that drops a koma from komadai.
 * -1: FU
 * -2: KY
 * -3: KE
 * -4: GI
 * -5: KI
 * -6: KA
 * -7: HI
 * 
 */
export type Sashite = {
    fromRow: number;
    fromCol: number;
    toRow: number;
    toCol: number;
    komaKind: KomaKind;
    promote: boolean;
    comment: string;
    tesuu: number;
    next: Sashite[];
};

/**
 * 開始局面と指し手のリストを保持するクラス
 * 
 * n手目の局面を取得したり手を追加する際は、各指し手の分岐先を表す長さnの配列`path`使って指定する
 */
export class Kifu {
    startKyokumen: Kyokumen;
    root: Sashite;

    constructor() {
        this.startKyokumen = new Kyokumen();
        this.startKyokumen.init();
        this.root = {
            fromRow: -255,
            fromCol: -255,
            toRow: -255,
            toCol: -255,
            komaKind: "FU",
            promote: false,
            comment: "",
            tesuu: 0,
            next: []
        };
    }

    /**
     * Return the kyokumen after n手目 is played, following the branches.
     * 
     * If n == 0, return the start kyokumen. (0手目 is treated as a move that does nothing))
     */
    getKyokumen(path: number[]): Kyokumen {
        const kyokumen = this.startKyokumen.clone();
        let sashite = this.root;

        for (const idx of path) {
            if (sashite.next.length <= idx) {
                throw new Error(`Tried to move into 変化${idx + 1} at ${sashite.tesuu}手目 but it does not exist`);
            }

            sashite = sashite.next[idx];

            if (!kyokumen.isLegal(sashite.fromRow, sashite.fromCol, sashite.toRow, sashite.toCol)) {
                throw new Error(`Invalid sashite: ${sashite.tesuu}手目, from(${sashite.fromRow}, \
                    ${sashite.fromCol}) to(${sashite.toRow}, ${sashite.toCol}) ${sashite.komaKind} `);
            }

            kyokumen.move(sashite);
        }

        return kyokumen;
    }

    getSashite(path: number[]): Sashite {
        let sashite = this.root;

        for (const idx of path) {
            if (sashite.next.length <= idx) {
                throw new Error(`Tried to move into 変化${idx + 1} at ${sashite.tesuu}手目 but it does not exist`);
            }

            sashite = sashite.next[idx];
        }

        return sashite;
    }

    isLegal(path: number[], fromRow: number, fromCol: number, toRow: number, toCol: number): [boolean, boolean] {
        const kyokumen = this.getKyokumen(path);

        const legal = kyokumen.isLegal(fromRow, fromCol, toRow, toCol);

        if (kyokumen.teban == "Sente" && fromRow >= 0 && fromRow <= 2) {
            return [legal, true];
        }

        if (kyokumen.teban == "Gote" && fromRow >= 7 && fromRow <= 9) {
            return [legal, true];
        }

        return [legal, false];
    }

    /**
     * `path`の分岐に従ってn手目の後に指し手を加え、追加した手のインデックス(`Sashite.next[index]`)を返す
     *
     * 例えばn手目以降に指し手が無かった場合は0を返すが、既に異なる手が一つあった場合は1を返す
     * 
     * 同じ手が存在している場合、何もせずにその手のインデックスを返す
     *  
     * @param path 各指し手での分岐先を表す長さnの配列
     * @returns 追加もしくは既に存在している手のインデックス
     */
    addSashite(path: number[], fromRow: number, fromCol: number, toRow: number, toCol: number, promote: boolean): number {
        const targetSashite = this.getSashite(path);

        for (let i = 0; i < targetSashite.next.length; i++) {
            const s = targetSashite.next[i];
            if (s.fromRow === fromRow && s.fromCol === fromCol && s.toRow === toRow && s.toCol === toCol && s.promote === promote) {
                return i;
            }
        }

        const kyokumen = this.getKyokumen(path);

        if (!kyokumen.isLegal(fromRow, fromCol, toRow, toCol)) {
            throw new Error(`Invalid sashite: ${path.length + 1}手目, from(${fromRow}, \\
                    ${fromCol}) to(${toRow}, ${toCol}) ${promote ? "+" : ""}`);
        }

        let komaKind: KomaKind;

        if (fromRow >= 0) {
            komaKind = kyokumen.ban[fromRow][fromCol]!.kind;
        } else if (fromRow === -1) {
            komaKind = "FU";
        } else if (fromRow === -2) {
            komaKind = "KY";
        } else if (fromRow === -3) {
            komaKind = "KE";
        } else if (fromRow === -4) {
            komaKind = "GI";
        } else if (fromRow === -5) {
            komaKind = "KI";
        } else if (fromRow === -6) {
            komaKind = "KA";
        } else if (fromRow === -7) {
            komaKind = "HI";
        } else {
            throw new Error(`Invalid fromRow: ${fromRow}`);
        }

        targetSashite.next.push({
            fromRow,
            fromCol,
            toRow,
            toCol,
            komaKind,
            promote,
            comment: "",
            tesuu: path.length + 1,
            next: []
        });

        return targetSashite.next.length - 1;
    }

    /**
     * Remove the sashite at the given path.
     * 
     * @param path The path to the sashite to remove.
     */
    removeSashite(path: number[]) {
        if (path.length === 0) {
            throw new Error("Cannot remove the root sashite");
        }

        const parentSashite = this.getSashite(path.slice(0, path.length - 1));

        const targetIdx = path[path.length - 1];

        parentSashite.next.splice(targetIdx, 1);
    }


    /**
     * Following path, return the sashites in list.
     * If there is a branch in the middle of the sequence, record it with the tesuu.
     * 
     * When it reaches the end node of the sashite tree, it will stop.
     * In the other words, longer path than the actual path length doesn't matter.
    */
    getSashiteList(path: number[]): [string[], Record<number, string[]>] {
        const list = [];
        const branchList: Record<number, string[]> = {};

        let currentSashite = this.root;
        list.push(fmtSashite(currentSashite))

        for (const idx of path) {
            if (currentSashite.next.length === 0) {
                break;
            }

            if (currentSashite.next.length > 1) {
                branchList[currentSashite.tesuu] = [];

                currentSashite.next.forEach(s => {
                    branchList[currentSashite.tesuu].push(fmtSashite(s));
                });
            }

            if (idx >= currentSashite.next.length) {
                throw new Error(`While making sashite list, at ${currentSashite.tesuu}手目, tried to move into 変化${idx + 1} that doesn't exist`);
            }

            currentSashite = currentSashite.next[idx];
            list.push(fmtSashite(currentSashite));
        }

        return [list, branchList];
    }
}

export class Kyokumen {
    ban: Masu[][];
    komadaiSente: KomaDai;
    komadaiGote: KomaDai;
    teban: Player;
    lastSashite: Sashite | null;

    constructor() {
        this.ban = [];

        const komadai: KomaDai = {
            FU: 0,
            KY: 0,
            KE: 0,
            GI: 0,
            KI: 0,
            KA: 0,
            HI: 0,
            OU: 0
        };

        this.komadaiSente = { ...komadai };
        this.komadaiGote = { ...komadai };

        this.teban = "Sente";

        this.lastSashite = null;
    }

    clone(): Kyokumen {
        const copy = new Kyokumen();
        copy.ban = this.ban.map(row => row.map(masu => masu ? { ...masu } : null));
        copy.komadaiSente = { ...this.komadaiSente };
        copy.komadaiGote = { ...this.komadaiGote };
        copy.teban = this.teban;
        copy.lastSashite = this.lastSashite;
        return copy;
    }

    init() {
        this.ban = Array.from({ length: 9 }, () => Array(9).fill(null));

        this.ban[0][0] = {
            kind: "KY",
            owner: "Gote",
            promoted: false
        }

        this.ban[0][1] = {
            kind: "KE",
            owner: "Gote",
            promoted: false
        }

        this.ban[0][2] = {
            kind: "GI",
            owner: "Gote",
            promoted: false
        }

        this.ban[0][3] = {
            kind: "KI",
            owner: "Gote", promoted: false
        }

        this.ban[0][4] = {
            kind: "OU",
            owner: "Gote",
            promoted: false
        }

        this.ban[0][5] = {
            kind: "KI",
            owner: "Gote",
            promoted: false
        }

        this.ban[0][6] = {
            kind: "GI",
            owner: "Gote",
            promoted: false
        }

        this.ban[0][7] = {
            kind: "KE",
            owner: "Gote",
            promoted: false
        }

        this.ban[0][8] = {
            kind: "KY",
            owner: "Gote",
            promoted: false
        }

        this.ban[1][1] = {
            kind: "HI",
            owner: "Gote",
            promoted: false
        }

        this.ban[1][7] = {
            kind: "KA",
            owner: "Gote",
            promoted: false
        }

        for (let col = 0; col < 9; col++) {
            this.ban[2][col] = {
                kind: "FU",
                owner: "Gote",
                promoted: false
            }
        }

        for (let col = 0; col < 9; col++) {
            this.ban[6][col] = {
                kind: "FU",
                owner: "Sente",
                promoted: false
            }
        }

        this.ban[7][7] = {
            kind: "HI",
            owner: "Sente",
            promoted: false
        }

        this.ban[7][1] = {
            kind: "KA",
            owner: "Sente",
            promoted: false
        }

        this.ban[8][0] = {
            kind: "KY",
            owner: "Sente",
            promoted: false
        }

        this.ban[8][1] = {
            kind: "KE",
            owner: "Sente",
            promoted: false
        }

        this.ban[8][2] = {
            kind: "GI",
            owner: "Sente",
            promoted: false
        }

        this.ban[8][3] = {
            kind: "KI",
            owner: "Sente",
            promoted: false
        }

        this.ban[8][4] = {
            kind: "OU",
            owner: "Sente",
            promoted: false
        }

        this.ban[8][5] = {
            kind: "KI",
            owner: "Sente",
            promoted: false
        }

        this.ban[8][6] = {
            kind: "GI",
            owner: "Sente",
            promoted: false
        }

        this.ban[8][7] = {
            kind: "KE",
            owner: "Sente",
            promoted: false
        }

        this.ban[8][8] = {
            kind: "KY",
            owner: "Sente",
            promoted: false
        }
    }

    move(sashite: Sashite) {
        if (sashite.fromRow === -255) {
            return;
        }

        if (sashite.fromRow < 0) {
            // Drop Move
            const owner = this.teban;
            const komadai = owner === "Sente" ? this.komadaiSente : this.komadaiGote;
            const kind = sashite.komaKind;

            if (kind in komadai && komadai[kind as keyof KomaDai] > 0) {
                komadai[kind as keyof KomaDai]--;
            } else {
                throw new Error(`Insufficient pieces in Komadai: ${kind}`);
            }

            this.ban[sashite.toRow][sashite.toCol] = {
                kind,
                owner,
                promoted: false
            };
        } else {
            // Normal Move
            const koma = this.ban[sashite.fromRow][sashite.fromCol];
            if (!koma) {
                throw new Error("No piece to move");
            }

            const target = this.ban[sashite.toRow][sashite.toCol];
            if (target) {
                // Capture
                const capturedKind = unpromote(target.kind);
                const owner = koma.owner;
                const komadai = owner === "Sente" ? this.komadaiSente : this.komadaiGote;

                if (capturedKind in komadai) {
                    komadai[capturedKind]++;
                }
            }

            this.ban[sashite.toRow][sashite.toCol] = {
                ...koma,
                kind: sashite.komaKind, // Use the kind from sashite in case of promotion
                promoted: sashite.promote
            };
            this.ban[sashite.fromRow][sashite.fromCol] = null;
        }

        // Toggle turn
        this.teban = this.teban === "Sente" ? "Gote" : "Sente";
        this.lastSashite = sashite;
    }

    isLegal(fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
        if (fromRow === -255) {
            return true;
        }

        if (fromRow < 0) {
            // Drop Move Validation
            if (this.ban[toRow][toCol]) return false; // Square must be empty

            // If it's trying to drop a koma from Gote's komadai(-11 ~ -17)
            // but the teban is Sente.
            if ((fromRow < -10) && this.teban === "Sente") return false;

            // Same as above but for Sente's komadai(-1 ~ -7)
            if ((fromRow > -10) && this.teban === "Gote") return false;

            const komadai = this.teban === "Sente" ? this.komadaiSente : this.komadaiGote;
            let kind: KomaKind;
            switch (fromRow) {
                case -1 || -11: kind = "FU"; break;
                case -2 || -12: kind = "KY"; break;
                case -3 || -13: kind = "KE"; break;
                case -4 || -14: kind = "GI"; break;
                case -5 || -15: kind = "KI"; break;
                case -6 || -16: kind = "KA"; break;
                case -7 || -17: kind = "HI"; break;
                default: return false;
            }

            if (komadai[kind as keyof KomaDai] <= 0) return false;

            // Basic drop constraints (rank limits)
            if (this.teban === "Sente") {
                if (kind === "FU" && toRow === 0) return false;
                if (kind === "KY" && toRow === 0) return false;
                if (kind === "KE" && toRow <= 1) return false;
            } else {
                if (kind === "FU" && toRow === 8) return false;
                if (kind === "KY" && toRow === 8) return false;
                if (kind === "KE" && toRow >= 7) return false;
            }

            // Nifu check
            if (kind === "FU") {
                for (let r = 0; r < 9; r++) {
                    const k = this.ban[r][toCol];
                    if (k && k.kind === "FU" && k.owner === this.teban) return false;
                }
            }

            return true;
        }

        const koma = this.ban[fromRow][fromCol];
        if (!koma) return false;
        if (koma.owner !== this.teban) return false;

        const target = this.ban[toRow][toCol];
        if (target && target.owner === koma.owner) return false;

        const rowDiff = toRow - fromRow;
        const colDiff = toCol - fromCol;
        const forward = koma.owner === "Sente" ? -1 : 1;

        // Basic movement rules
        switch (koma.kind) {
            case "FU":
                return colDiff === 0 && rowDiff === forward;
            case "KY":
                if (colDiff !== 0) return false;
                if (forward === -1) {
                    if (rowDiff >= 0) return false;
                    for (let r = fromRow - 1; r > toRow; r--) {
                        if (this.ban[r][fromCol]) return false;
                    }
                    return true;
                } else {
                    if (rowDiff <= 0) return false;
                    for (let r = fromRow + 1; r < toRow; r++) {
                        if (this.ban[r][fromCol]) return false;
                    }
                    return true;
                }
            case "KE":
                return Math.abs(colDiff) === 1 && rowDiff === forward * 2;
            case "GI":
                if (Math.abs(rowDiff) > 1 || Math.abs(colDiff) > 1) return false;
                if (rowDiff === forward && Math.abs(colDiff) <= 1) return true;
                if (rowDiff === -forward && Math.abs(colDiff) === 1) return true;
                return false;
            case "KI":
            case "FU+":
            case "KY+":
            case "KE+":
            case "GI+":
                if (Math.abs(rowDiff) > 1 || Math.abs(colDiff) > 1) return false;
                if (rowDiff === forward && Math.abs(colDiff) <= 1) return true;
                if (rowDiff === 0 && Math.abs(colDiff) === 1) return true;
                if (rowDiff === -forward && colDiff === 0) return true;
                return false;
            case "KA":
                if (Math.abs(rowDiff) !== Math.abs(colDiff)) return false;
                const rStepKA = rowDiff > 0 ? 1 : -1;
                const cStepKA = colDiff > 0 ? 1 : -1;
                for (let i = 1; i < Math.abs(rowDiff); i++) {
                    if (this.ban[fromRow + i * rStepKA][fromCol + i * cStepKA]) return false;
                }
                return true;
            case "KA+":
                if (Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1) return true;
                if (Math.abs(rowDiff) !== Math.abs(colDiff)) return false;
                const rStepUMA = rowDiff > 0 ? 1 : -1;
                const cStepUMA = colDiff > 0 ? 1 : -1;
                for (let i = 1; i < Math.abs(rowDiff); i++) {
                    if (this.ban[fromRow + i * rStepUMA][fromCol + i * cStepUMA]) return false;
                }
                return true;
            case "HI":
                if (rowDiff !== 0 && colDiff !== 0) return false;
                if (rowDiff !== 0) {
                    const rStep = rowDiff > 0 ? 1 : -1;
                    for (let i = 1; i < Math.abs(rowDiff); i++) {
                        if (this.ban[fromRow + i * rStep][fromCol]) return false;
                    }
                } else {
                    const cStep = colDiff > 0 ? 1 : -1;
                    for (let i = 1; i < Math.abs(colDiff); i++) {
                        if (this.ban[fromRow][fromCol + i * cStep]) return false;
                    }
                }
                return true;
            case "HI+":
                if (Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1) return true;
                if (rowDiff !== 0 && colDiff !== 0) return false;
                if (rowDiff !== 0) {
                    const rStep = rowDiff > 0 ? 1 : -1;
                    for (let i = 1; i < Math.abs(rowDiff); i++) {
                        if (this.ban[fromRow + i * rStep][fromCol]) return false;
                    }
                } else {
                    const cStep = colDiff > 0 ? 1 : -1;
                    for (let i = 1; i < Math.abs(colDiff); i++) {
                        if (this.ban[fromRow][fromCol + i * cStep]) return false;
                    }
                }
                return true;
            case "OU":
                return Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1;
            default:
                return false;
        }
    }
}

function promote(koma: KomaKind): KomaKind {
    switch (koma) {
        case "FU":
            return "FU+";
        case "KY":
            return "KY+";
        case "KE":
            return "KE+";
        case "GI":
            return "GI+";
        case "KA":
            return "KA+";
        case "HI":
            return "HI+";
        default:
            throw new Error(`koma ${koma} cannot be promoted`);
    }
}

function unpromote(koma: KomaKind): Exclude<KomaKind, "FU+" | "KY+" | "KE+" | "GI+" | "KA+" | "HI+"> {
    switch (koma) {
        case "FU+":
            return "FU";
        case "KY+":
            return "KY";
        case "KE+":
            return "KE";
        case "GI+":
            return "GI";
        case "KA+":
            return "KA";
        case "HI+":
            return "HI";
        default:
            return koma;
    }
}

function fmtSashite(sashite: Sashite): string {
    if (sashite.fromRow === -255) {
        return "開始局面";
    }

    const col = 9 - sashite.toCol;
    let colStr;

    switch (col) {
        case 1:
            colStr = "１";
            break;
        case 2:
            colStr = "２";
            break;
        case 3:
            colStr = "３";
            break;
        case 4:
            colStr = "４";
            break;
        case 5:
            colStr = "５";
            break;
        case 6:
            colStr = "６";
            break;
        case 7:
            colStr = "７";
            break;
        case 8:
            colStr = "８";
            break;
        case 9:
            colStr = "９";
            break;
    }

    const row = sashite.toRow + 1;
    let rowStr;

    switch (row) {
        case 1:
            rowStr = "一";
            break;
        case 2:
            rowStr = "二";
            break;
        case 3:
            rowStr = "三";
            break;
        case 4:
            rowStr = "四";
            break;
        case 5:
            rowStr = "五";
            break;
        case 6:
            rowStr = "六";
            break;
        case 7:
            rowStr = "七";
            break;
        case 8:
            rowStr = "八";
            break;
        case 9:
            rowStr = "九";
            break;
    }

    const komaKind = sashite.komaKind;
    let komaKindStr;

    switch (komaKind) {
        case "OU":
            komaKindStr = "玉";
            break;
        case "HI":
            komaKindStr = "飛";
            break;
        case "KA":
            komaKindStr = "角";
            break;
        case "KI":
            komaKindStr = "金";
            break;
        case "GI":
            komaKindStr = "銀";
            break;
        case "KE":
            komaKindStr = "桂";
            break;
        case "KY":
            komaKindStr = "香";
            break;
        case "FU":
            komaKindStr = "歩";
            break;
        case "FU+":
            komaKindStr = "と";
            break;
        case "KY+":
            komaKindStr = "成香";
            break;
        case "KE+":
            komaKindStr = "成桂";
            break;
        case "GI+":
            komaKindStr = "成銀";
            break;
        case "KA+":
            komaKindStr = "馬";
            break;
        case "HI+":
            komaKindStr = "竜";
            break;
    }

    return `${colStr}${rowStr}${komaKindStr}`;
}