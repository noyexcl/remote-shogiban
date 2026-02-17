import { produce } from "immer";

export type Masu = Koma | null;

export type KomaDai = Record<Exclude<KomaKind, "FU+" | "KY+" | "KE+" | "GI+" | "KA+" | "HI+">, number>;

type KomaKind = "FU" | "KY" | "KE" | "GI" | "KI" | "KA" | "HI" | "OU"
    | "FU+" | "KY+" | "KE+" | "GI+" | "KA+" | "HI+";

type Player = "Sente" | "Gote";

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
        /*
        if (!this.isLegal(sashite)) {
            throw new Error("Invalid move");
        }
        */

        if (sashite.fromRow == -255) {
            return;
        }

        const koma = this.ban[sashite.fromRow][sashite.fromCol];
        if (!koma) {
            throw new Error("No piece to move");
        }

        const target = this.ban[sashite.toRow][sashite.toCol];
        if (target) {
            // Capture
            const capturedKind = unpromote(target.kind); // Promoted pieces revert to original kind when captured
            const owner = koma.owner;
            const komadai = owner === "Sente" ? this.komadaiSente : this.komadaiGote;

            if (capturedKind in komadai) {
                komadai[capturedKind]++;
            }
        }

        this.ban[sashite.toRow][sashite.toCol] = {
            ...koma,
        };
        this.ban[sashite.fromRow][sashite.fromCol] = null;

        // Toggle turn
        this.teban = this.teban === "Sente" ? "Gote" : "Sente";

        this.lastSashite = sashite;
    }

    isLegal(fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
        if (fromRow == -255) {
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

        // Basic movement rules (simplified for now, covering main pieces)
        // TODO: Add promotion rules and full movement validation for all pieces
        switch (koma.kind) {
            case "FU":
                return colDiff === 0 && rowDiff === forward;
            case "KY":
                if (colDiff !== 0) return false;
                if (forward === -1) {
                    if (rowDiff >= 0) return false; // Must move forward (negative rowDiff for Sente)
                    // Check for obstacles
                    for (let r = fromRow - 1; r > toRow; r--) {
                        if (this.ban[r][fromCol]) return false;
                    }
                    return true;
                } else {
                    if (rowDiff <= 0) return false; // Must move forward (positive rowDiff for Gote)
                    // Check for obstacles
                    for (let r = fromRow + 1; r < toRow; r++) {
                        if (this.ban[r][fromCol]) return false;
                    }
                    return true;
                }
            case "KE":
                return Math.abs(colDiff) === 1 && rowDiff === forward * 2;
            case "GI":
                // Forward, Forward-Left, Forward-Right, Backward-Left, Backward-Right
                if (Math.abs(rowDiff) > 1 || Math.abs(colDiff) > 1) return false;
                if (rowDiff === forward && Math.abs(colDiff) <= 1) return true; // Forward 3 directions
                if (rowDiff === -forward && Math.abs(colDiff) === 1) return true; // Backward diagonals
                return false;
            case "KI":
                // Forward 3 dirs, Side 2 dirs, Backward 1 dir
                if (Math.abs(rowDiff) > 1 || Math.abs(colDiff) > 1) return false;
                if (rowDiff === forward && Math.abs(colDiff) <= 1) return true; // Forward 3
                if (rowDiff === 0 && Math.abs(colDiff) === 1) return true; // Sides
                if (rowDiff === -forward && colDiff === 0) return true; // Backward straight
                return false;
            case "KA":
                if (Math.abs(rowDiff) !== Math.abs(colDiff)) return false;
                // Check path
                const rStep = rowDiff > 0 ? 1 : -1;
                const cStep = colDiff > 0 ? 1 : -1;
                for (let i = 1; i < Math.abs(rowDiff); i++) {
                    if (this.ban[fromRow + i * rStep][fromCol + i * cStep]) return false;
                }
                return true;
            case "HI":
                if (rowDiff !== 0 && colDiff !== 0) return false;
                // Check path
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

    const col = sashite.toCol + 1;
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

    const row = 9 - sashite.toRow;
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