export type Masu = Koma | null;

export type KomaDaiData = Record<Exclude<KomaKind, "FU+" | "KY+" | "KE+" | "GI+" | "KA+" | "HI+">, number>;

export type KomaKind = "FU" | "KY" | "KE" | "GI" | "KI" | "KA" | "HI" | "OU"
    | "FU+" | "KY+" | "KE+" | "GI+" | "KA+" | "HI+";

export type Player = "Sente" | "Gote";

export type Koma = {
    kind: KomaKind;
    owner: Player;
};

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
            fromRow: -1,
            fromCol: -1,
            toRow: -1,
            toCol: -1,
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
        let kyokumen = this.startKyokumen;
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

            kyokumen = kyokumen.move(sashite.fromRow, sashite.fromCol, sashite.toRow, sashite.toCol, sashite.promote);
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


        if (fromRow < 10) {
            komaKind = kyokumen.ban[fromRow][fromCol]!.kind;
        } else {
            komaKind = getDroppedKomaKind(fromRow);
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
    komadaiSente: KomaDaiData;
    komadaiGote: KomaDaiData;
    teban: Player;
    lastFromRow: number | null;
    lastFromCol: number | null;
    lastToRow: number | null;
    lastToCol: number | null;

    constructor() {
        this.ban = [];

        const komadai: KomaDaiData = {
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

        this.lastFromRow = null;
        this.lastFromCol = null;
        this.lastToRow = null;
        this.lastToCol = null;
    }

    clone(): Kyokumen {
        const copy = new Kyokumen();
        copy.ban = this.ban.map(row => row.map(masu => masu ? { ...masu } : null));
        copy.komadaiSente = { ...this.komadaiSente };
        copy.komadaiGote = { ...this.komadaiGote };
        copy.teban = this.teban;
        copy.lastFromRow = this.lastFromRow;
        copy.lastFromCol = this.lastFromCol;
        copy.lastToRow = this.lastToRow;
        copy.lastToCol = this.lastToCol;
        return copy;
    }

    init() {
        this.ban = Array.from({ length: 9 }, () => Array(9).fill(null));

        this.ban[0][0] = {
            kind: "KY",
            owner: "Gote",
        }

        this.ban[0][1] = {
            kind: "KE",
            owner: "Gote",
        }

        this.ban[0][2] = {
            kind: "GI",
            owner: "Gote",
        }

        this.ban[0][3] = {
            kind: "KI",
            owner: "Gote",
        }

        this.ban[0][4] = {
            kind: "OU",
            owner: "Gote",
        }

        this.ban[0][5] = {
            kind: "KI",
            owner: "Gote",
        }

        this.ban[0][6] = {
            kind: "GI",
            owner: "Gote",
        }

        this.ban[0][7] = {
            kind: "KE",
            owner: "Gote",
        }

        this.ban[0][8] = {
            kind: "KY",
            owner: "Gote",
        }

        this.ban[1][1] = {
            kind: "HI",
            owner: "Gote",
        }

        this.ban[1][7] = {
            kind: "KA",
            owner: "Gote",
        }

        for (let col = 0; col < 9; col++) {
            this.ban[2][col] = {
                kind: "FU",
                owner: "Gote",
            }
        }

        for (let col = 0; col < 9; col++) {
            this.ban[6][col] = {
                kind: "FU",
                owner: "Sente",
            }
        }

        this.ban[7][7] = {
            kind: "HI",
            owner: "Sente",
        }

        this.ban[7][1] = {
            kind: "KA",
            owner: "Sente",
        }

        this.ban[8][0] = {
            kind: "KY",
            owner: "Sente",
        }

        this.ban[8][1] = {
            kind: "KE",
            owner: "Sente",
        }

        this.ban[8][2] = {
            kind: "GI",
            owner: "Sente",
        }

        this.ban[8][3] = {
            kind: "KI",
            owner: "Sente",
        }

        this.ban[8][4] = {
            kind: "OU",
            owner: "Sente",
        }

        this.ban[8][5] = {
            kind: "KI",
            owner: "Sente",
        }

        this.ban[8][6] = {
            kind: "GI",
            owner: "Sente",
        }

        this.ban[8][7] = {
            kind: "KE",
            owner: "Sente",
        }

        this.ban[8][8] = {
            kind: "KY",
            owner: "Sente",
        }
    }

    /** 
     * 現局面から指し手を指した状態へ遷移する
     * 
     * この関数は指し手が合法であることを前提としている
     * 
     * 駒台の駒を打つ手は `fromRow` を以下のように設定することで表現する
     * 
     * 先手の駒台 / 後手の駒台
     * - 歩: 10 / 20
     * - 桂: 11 / 21
     * - 香: 12 / 22
     * - 銀: 13 / 23
     * - 金: 14 / 24
     * - 角: 15 / 25
     * - 飛: 16 / 26
     * 
     * 0手目(何もしない手)を表す時は `fromRow` に -1 を設定する \
     * この手を渡しても何も起こらず、手番すら変わらない
    */
    move(fromRow: number, fromCol: number, toRow: number, toCol: number, promote: boolean): Kyokumen {
        const nextKyokumen = this.clone();

        if (fromRow === -1) {
            return nextKyokumen;
        }

        if (fromRow >= 10) {
            // Drop Move
            const komadai = fromRow >= 20 ? nextKyokumen.komadaiGote : nextKyokumen.komadaiSente;
            const kind = getDroppedKomaKind(fromRow);

            komadai[kind as keyof KomaDaiData]--;

            nextKyokumen.ban[toRow][toCol] = {
                kind,
                owner: this.teban,
            };
        } else {
            // Normal Move
            const koma = nextKyokumen.ban[fromRow][fromCol];
            if (!koma) {
                throw new Error("No piece to move");
            }

            const target = nextKyokumen.ban[toRow][toCol];
            if (target) {
                // Capture
                const capturedKind = unpromoteKoma(target.kind);
                const komadai = this.teban === "Sente" ? nextKyokumen.komadaiSente : nextKyokumen.komadaiGote;
                komadai[capturedKind]++;
            }

            nextKyokumen.ban[toRow][toCol] = {
                ...koma,
                kind: promote ? promoteKoma(koma.kind) : koma.kind,
            };
            nextKyokumen.ban[fromRow][fromCol] = null;
        }

        // Toggle turn
        nextKyokumen.teban = this.teban === "Sente" ? "Gote" : "Sente";

        nextKyokumen.lastFromRow = fromRow;
        nextKyokumen.lastFromCol = fromCol;
        nextKyokumen.lastToRow = toRow;
        nextKyokumen.lastToCol = toCol;

        return nextKyokumen
    }

    /** 
     * 現局面から指し手が合法かどうかを判定する
     * 
     * 駒台の駒を打つ場合は `fromRow` を以下のように設定することで表現する
     * 
     * 先手の駒台 / 後手の駒台
     * - 歩: 10 / 20
     * - 桂: 11 / 21
     * - 香: 12 / 22
     * - 銀: 13 / 23
     * - 金: 14 / 24
     * - 角: 15 / 25
     * - 飛: 16 / 26
     * 
     * 0手目(何もしない手)を表す時は `fromRow` に -1 を設定する \
     * -1は常に合法となる
    */
    isLegal(fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
        if (fromRow === -1) {
            return true;
        }

        if (fromRow >= 10) {
            // Drop Move Validation
            if (this.ban[toRow][toCol]) return false; // Square must be empty

            // If Sente is trying to drop a koma from Gote's komadai
            if ((fromRow >= 20) && this.teban === "Sente") return false;

            // If Gote is trying to drop a koma from Sente's komadai
            if ((fromRow >= 10 && fromRow <= 16) && this.teban === "Gote") return false;

            const komadai = this.teban === "Sente" ? this.komadaiSente : this.komadaiGote;
            let kind: KomaKind;
            switch (fromRow) {
                case 10:
                case 20: kind = "FU"; break;
                case 11:
                case 21: kind = "KY"; break;
                case 12:
                case 22: kind = "KE"; break;
                case 13:
                case 23: kind = "GI"; break;
                case 14:
                case 24: kind = "KI"; break;
                case 15:
                case 25: kind = "KA"; break;
                case 16:
                case 26: kind = "HI"; break;
                default: return false;
            }

            if (komadai[kind as keyof KomaDaiData] <= 0) return false;

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

    isSucidalMove(fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
        const nextKyokumen = this.move(fromRow, fromCol, toRow, toCol, false);

        return nextKyokumen.isBeingChecked(this.teban);
    }

    /**
     * 現局面において指し手が成るのが必須かどうか判断する
     * 
     * この関数は指し手が合法であることを前提とする
     */
    isMandatoryPromotion(fromRow: number, fromCol: number, toRow: number): boolean {
        if (fromRow >= 10 || fromRow === -1) return false;

        const koma = this.ban[fromRow][fromCol];
        if (!koma) return false;

        if (this.teban === "Sente") {
            if ((koma.kind === "FU" || koma.kind === "KY") && toRow === 0) return true;
            if (koma.kind === "KE" && toRow <= 1) return true;
        } else {
            if ((koma.kind === "FU" || koma.kind === "KY") && toRow === 8) return true;
            if (koma.kind === "KE" && toRow >= 7) return true;
        }
        return false;
    }

    /**
     * 現局面において指し手が成れるかどうか判断する
     * 
     * この関数は指し手が合法であることを前提とする
     */
    canPromote(fromRow: number, fromCol: number, toRow: number): boolean {
        if (fromRow >= 10 || fromRow === -1) return false;

        const koma = this.ban[fromRow][fromCol];
        if (!koma) return false;

        const promotableKinds: KomaKind[] = ["FU", "KY", "KE", "GI", "KA", "HI"];
        if (!promotableKinds.includes(koma.kind)) return false;

        const isSenteban = this.teban === "Sente";
        const inPromotionZone = isSenteban
            ? (fromRow <= 2 || toRow <= 2)
            : (fromRow >= 6 || toRow >= 6);
        return inPromotionZone;
    }

    isBeingChecked(player: Player): boolean {
        const opponent = player === "Sente" ? "Gote" : "Sente";

        // 相手の駒の利きを全てチェックする
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const koma = this.ban[r][c];
                if (!koma || koma.owner !== opponent) continue;

                switch (koma.kind) {
                    case "OU": break;
                    case "FU":
                        if (opponent === "Sente") {
                            if (r - 1 >= 0 && this.ban[r - 1][c]?.kind === "OU" && this.ban[r - 1][c]?.owner === player) {
                                return true;
                            }
                        } else {
                            if (r + 1 >= 8 && this.ban[r + 1][c]?.kind === "OU" && this.ban[r + 1][c]?.owner === player) {
                                return true;
                            }
                        }
                        break;
                    case "KY":
                        if (opponent === "Sente") {
                            for (let new_r = r - 1; new_r >= 0; new_r--) {
                                if (this.ban[new_r][c]?.kind === "OU" && this.ban[new_r][c]?.owner === player) {
                                    return true;
                                }
                                // 利きの途中に玉以外の駒がある場合 
                                if (this.ban[new_r][c]) break;
                            }
                        } else {
                            for (let new_r = r + 1; new_r <= 8; new_r++) {
                                if (this.ban[new_r][c]?.kind === "OU" && this.ban[new_r][c]?.owner === player) {
                                    return true;
                                }
                                // 利きの途中に玉以外の駒がある場合 
                                if (this.ban[new_r][c]) break;
                            }
                        }
                        break;
                    case "KE":
                        if (opponent === "Sente") {
                            if (r - 2 >= 0 && c - 1 >= 0 && this.ban[r - 2][c - 1]?.kind === "OU" && this.ban[r - 2][c - 1]?.owner === player) {
                                return true;
                            }
                            if (r - 2 >= 0 && c + 1 <= 8 && this.ban[r - 2][c + 1]?.kind === "OU" && this.ban[r - 2][c + 1]?.owner === player) {
                                return true;
                            }
                        } else {
                            if (r + 2 <= 8 && c - 1 >= 0 && this.ban[r + 2][c - 1]?.kind === "OU" && this.ban[r + 2][c - 1]?.owner === player) {
                                return true;
                            }
                            if (r + 2 <= 8 && c + 1 <= 8 && this.ban[r + 2][c + 1]?.kind === "OU" && this.ban[r + 2][c + 1]?.owner === player) {
                                return true;
                            }
                        }
                        break;
                    case "GI":
                        if (opponent === "Sente") {
                            if (r - 1 >= 0 && this.ban[r - 1][c]?.kind === "OU" && this.ban[r - 1][c]?.owner === player) {
                                return true;
                            }
                            if (r - 1 >= 0 && c - 1 >= 0 && this.ban[r - 1][c - 1]?.kind === "OU" && this.ban[r - 1][c - 1]?.owner === player) {
                                return true;
                            }
                            if (r - 1 >= 0 && c + 1 <= 8 && this.ban[r - 1][c + 1]?.kind === "OU" && this.ban[r - 1][c + 1]?.owner === player) {
                                return true;
                            }
                            if (r + 1 <= 8 && c - 1 >= 0 && this.ban[r + 1][c - 1]?.kind === "OU" && this.ban[r + 1][c - 1]?.owner === player) {
                                return true;
                            }
                            if (r + 1 <= 8 && c + 1 <= 8 && this.ban[r + 1][c + 1]?.kind === "OU" && this.ban[r + 1][c + 1]?.owner === player) {
                                return true;
                            }
                        } else {
                            if (r - 1 >= 0 && this.ban[r - 1][c]?.kind === "OU" && this.ban[r - 1][c]?.owner === player) {
                                return true;
                            }
                            if (r - 1 >= 0 && c - 1 >= 0 && this.ban[r - 1][c - 1]?.kind === "OU" && this.ban[r - 1][c - 1]?.owner === player) {
                                return true;
                            }
                            if (r - 1 >= 0 && c + 1 <= 8 && this.ban[r - 1][c + 1]?.kind === "OU" && this.ban[r - 1][c + 1]?.owner === player) {
                                return true;
                            }
                            if (r + 1 <= 8 && c - 1 >= 0 && this.ban[r + 1][c - 1]?.kind === "OU" && this.ban[r + 1][c - 1]?.owner === player) {
                                return true;
                            }
                            if (r + 1 <= 8 && c + 1 <= 8 && this.ban[r + 1][c + 1]?.kind === "OU" && this.ban[r + 1][c + 1]?.owner === player) {
                                return true;
                            }
                        }
                        break;
                    case "FU+":
                    case "KY+":
                    case "KE+":
                    case "GI+":
                    case "KI":
                        if (opponent === "Sente") {
                            if (r - 1 >= 0 && this.ban[r - 1][c]?.kind === "OU" && this.ban[r - 1][c]?.owner === player) {
                                return true;
                            }
                            if (r + 1 <= 8 && this.ban[r + 1][c]?.kind === "OU" && this.ban[r + 1][c]?.owner === player) {
                                return true;
                            }
                            if (c - 1 >= 0 && this.ban[r][c - 1]?.kind === "OU" && this.ban[r][c - 1]?.owner === player) {
                                return true;
                            }
                            if (c + 1 <= 8 && this.ban[r][c + 1]?.kind === "OU" && this.ban[r][c + 1]?.owner === player) {
                                return true;
                            }
                            if (r + 1 <= 8 && c - 1 >= 0 && this.ban[r + 1][c - 1]?.kind === "OU" && this.ban[r + 1][c - 1]?.owner === player) {
                                return true;
                            }
                            if (r + 1 <= 8 && c + 1 <= 8 && this.ban[r + 1][c + 1]?.kind === "OU" && this.ban[r + 1][c + 1]?.owner === player) {
                                return true;
                            }
                        } else {
                            if (r + 1 >= 8 && this.ban[r + 1][c]?.kind === "OU" && this.ban[r + 1][c]?.owner === player) {
                                return true;
                            }
                            if (r - 1 >= 0 && this.ban[r - 1][c]?.kind === "OU" && this.ban[r - 1][c]?.owner === player) {
                                return true;
                            }
                            if (c - 1 >= 0 && this.ban[r][c - 1]?.kind === "OU" && this.ban[r][c - 1]?.owner === player) {
                                return true;
                            }
                            if (c + 1 <= 8 && this.ban[r][c + 1]?.kind === "OU" && this.ban[r][c + 1]?.owner === player) {
                                return true;
                            }
                            if (r - 1 <= 8 && c - 1 >= 0 && this.ban[r + 1][c - 1]?.kind === "OU" && this.ban[r + 1][c - 1]?.owner === player) {
                                return true;
                            }
                            if (r - 1 <= 8 && c + 1 <= 8 && this.ban[r + 1][c + 1]?.kind === "OU" && this.ban[r + 1][c + 1]?.owner === player) {
                                return true;
                            }
                        }
                        break;
                    case "KA":
                        // 角は先後対称なので分ける必要がない
                        // 左上への走査
                        for (let [new_r, new_c] = [r - 1, c - 1]; new_r >= 0 && c >= 0; new_r--, new_c--) {
                            if (this.ban[new_r][new_c]?.kind === "OU" && this.ban[new_r][new_c]?.owner === player) {
                                return true;
                            }
                            // 利きの途中に玉以外の駒がある場合 
                            if (this.ban[new_r][new_c]) break;
                        }
                        // 右上への走査
                        for (let [new_r, new_c] = [r - 1, c + 1]; new_r >= 0 && c <= 8; new_r--, new_c++) {
                            if (this.ban[new_r][new_c]?.kind === "OU" && this.ban[new_r][new_c]?.owner === player) {
                                return true;
                            }
                            // 利きの途中に玉以外の駒がある場合 
                            if (this.ban[new_r][new_c]) break;
                        }
                        // 左下への走査
                        for (let [new_r, new_c] = [r + 1, c - 1]; new_r <= 8 && c >= 0; new_r++, new_c--) {
                            if (this.ban[new_r][new_c]?.kind === "OU" && this.ban[new_r][new_c]?.owner === player) {
                                return true;
                            }
                            // 利きの途中に玉以外の駒がある場合 
                            if (this.ban[new_r][new_c]) break;
                        }
                        // 右下への走査
                        for (let [new_r, new_c] = [r + 1, c + 1]; new_r <= 8 && c <= 8; new_r++, new_c++) {
                            if (this.ban[new_r][new_c]?.kind === "OU" && this.ban[new_r][new_c]?.owner === player) {
                                return true;
                            }
                            // 利きの途中に玉以外の駒がある場合 
                            if (this.ban[new_r][new_c]) break;
                        }
                        break;
                    case "HI":
                        // 上への走査
                        for (let new_r = r - 1; new_r >= 0; new_r--) {
                            if (this.ban[new_r][c]?.kind === "OU" && this.ban[new_r][c]?.owner === player) {
                                return true;
                            }
                            // 利きの途中に相手玉以外の駒がある場合 
                            if (this.ban[new_r][c]) break;
                        }
                        // 下への走査
                        for (let new_r = r + 1; new_r <= 8; new_r++) {
                            if (this.ban[new_r][c]?.kind === "OU" && this.ban[new_r][c]?.owner === player) {
                                return true;
                            }
                            // 利きの途中に相手玉以外の駒がある場合 
                            if (this.ban[new_r][c]) break;
                        }
                        // 左への走査
                        for (let new_c = c - 1; new_c >= 0; new_c--) {
                            if (this.ban[r][new_c]?.kind === "OU" && this.ban[r][new_c]?.owner === player) {
                                return true;
                            }
                            // 利きの途中に相手玉以外の駒がある場合 
                            if (this.ban[r][new_c]) break;
                        }
                        // 右への走査
                        for (let new_c = c + 1; new_c <= 8; new_c++) {
                            if (this.ban[r][new_c]?.kind === "OU" && this.ban[r][new_c]?.owner === player) {
                                return true;
                            }
                            // 利きの途中に相手玉以外の駒がある場合 
                            if (this.ban[r][new_c]) break;
                        }
                        break;
                    case "KA+":
                        // 馬は先後対称なので分ける必要がない
                        // 上下左右1マスの確認
                        if (r - 1 >= 0 && this.ban[r - 1][c]?.kind === "OU" && this.ban[r - 1][c]?.owner === player) {
                            return true;
                        }
                        if (r + 1 <= 8 && this.ban[r + 1][c]?.kind === "OU" && this.ban[r + 1][c]?.owner === player) {
                            return true;
                        }
                        if (c - 1 >= 0 && this.ban[r][c - 1]?.kind === "OU" && this.ban[r][c - 1]?.owner === player) {
                            return true;
                        }
                        if (c + 1 <= 8 && this.ban[r][c + 1]?.kind === "OU" && this.ban[r][c + 1]?.owner === player) {
                            return true;
                        }

                        // 左上への走査
                        for (let [new_r, new_c] = [r - 1, c - 1]; new_r >= 0 && c >= 0; new_r--, new_c--) {
                            if (this.ban[new_r][new_c]?.kind === "OU" && this.ban[new_r][new_c]?.owner === player) {
                                return true;
                            }
                            // 利きの途中に玉以外の駒がある場合 
                            if (this.ban[new_r][new_c]) break;
                        }
                        // 右上への走査
                        for (let [new_r, new_c] = [r - 1, c + 1]; new_r >= 0 && c <= 8; new_r--, new_c++) {
                            if (this.ban[new_r][new_c]?.kind === "OU" && this.ban[new_r][new_c]?.owner === player) {
                                return true;
                            }
                            // 利きの途中に玉以外の駒がある場合 
                            if (this.ban[new_r][new_c]) break;
                        }
                        // 左下への走査
                        for (let [new_r, new_c] = [r + 1, c - 1]; new_r <= 8 && c >= 0; new_r++, new_c--) {
                            if (this.ban[new_r][new_c]?.kind === "OU" && this.ban[new_r][new_c]?.owner === player) {
                                return true;
                            }
                            // 利きの途中に玉以外の駒がある場合 
                            if (this.ban[new_r][new_c]) break;
                        }
                        // 右下への走査
                        for (let [new_r, new_c] = [r + 1, c + 1]; new_r <= 8 && c <= 8; new_r++, new_c++) {
                            if (this.ban[new_r][new_c]?.kind === "OU" && this.ban[new_r][new_c]?.owner === player) {
                                return true;
                            }
                            // 利きの途中に玉以外の駒がある場合 
                            if (this.ban[new_r][new_c]) break;
                        }
                        break;
                    case "HI+":
                        // 斜め1マスの利きの確認
                        if (r - 1 >= 0 && c - 1 >= 0 && this.ban[r - 1][c - 1]?.kind === "OU" && this.ban[r - 1][c - 1]?.owner === player) {
                            return true;
                        }
                        if (r - 1 >= 0 && c + 1 <= 8 && this.ban[r - 1][c + 1]?.kind === "OU" && this.ban[r - 1][c + 1]?.owner === player) {
                            return true;
                        }
                        if (r + 1 <= 8 && c - 1 >= 0 && this.ban[r + 1][c - 1]?.kind === "OU" && this.ban[r + 1][c - 1]?.owner === player) {
                            return true;
                        }
                        if (r + 1 <= 8 && c + 1 <= 8 && this.ban[r + 1][c + 1]?.kind === "OU" && this.ban[r + 1][c + 1]?.owner === player) {
                            return true;
                        }

                        // 上への走査
                        for (let new_r = r - 1; new_r >= 0; new_r--) {
                            if (this.ban[new_r][c]?.kind === "OU" && this.ban[new_r][c]?.owner === player) {
                                return true;
                            }
                            // 利きの途中に相手玉以外の駒がある場合 
                            if (this.ban[new_r][c]) break;
                        }
                        // 下への走査
                        for (let new_r = r + 1; new_r <= 8; new_r++) {
                            if (this.ban[new_r][c]?.kind === "OU" && this.ban[new_r][c]?.owner === player) {
                                return true;
                            }
                            // 利きの途中に相手玉以外の駒がある場合 
                            if (this.ban[new_r][c]) break;
                        }
                        // 左への走査
                        for (let new_c = c - 1; new_c >= 0; new_c--) {
                            if (this.ban[r][new_c]?.kind === "OU" && this.ban[r][new_c]?.owner === player) {
                                return true;
                            }
                            // 利きの途中に相手玉以外の駒がある場合 
                            if (this.ban[r][new_c]) break;
                        }
                        // 右への走査
                        for (let new_c = c + 1; new_c <= 8; new_c++) {
                            if (this.ban[r][new_c]?.kind === "OU" && this.ban[r][new_c]?.owner === player) {
                                return true;
                            }
                            // 利きの途中に相手玉以外の駒がある場合 
                            if (this.ban[r][new_c]) break;
                        }
                        break;
                }
            }
        }

        return false;
    }
}

function promoteKoma(koma: KomaKind): KomaKind {
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

function unpromoteKoma(koma: KomaKind): Exclude<KomaKind, "FU+" | "KY+" | "KE+" | "GI+" | "KA+" | "HI+"> {
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
    if (sashite.fromRow === -1) {
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

    return `${colStr}${rowStr}${komaKindStr}${sashite.promote ? "成" : ""}`;
}

/**
 * 駒台の駒を打つ時のfromRowから駒の種類を返す
 */
function getDroppedKomaKind(fromRow: number): KomaKind {
    switch (fromRow) {
        case 10:
        case 20:
            return "FU";
        case 11:
        case 21:
            return "KY";
        case 12:
        case 22:
            return "KE";
        case 13:
        case 23:
            return "GI";
        case 14:
        case 24:
            return "KI";
        case 15:
        case 25:
            return "KA";
        case 16:
        case 26:
            return "HI";
        default:
            throw new Error(`fromRow ${fromRow} does not represent a dropped koma`);
    }
}

/**
 * 盤上の指し手は通常(fromRow, fromCol, toRow, toCol)で表せるが、駒台の駒を打つ手はfromRowに10\~16(先手),
 * 20\~26(後手)の値を設定して表現する必要がある
 * 
 * この関数は駒の種類と所持者から適切なfromRowを返す
 */
export function getFromRow(kind: KomaKind, owner: Player) {
    if (owner === "Sente") {
        switch (kind) {
            case "FU":
                return 10;
            case "KY":
                return 11;
            case "KE":
                return 12;
            case "GI":
                return 13;
            case "KI":
                return 14;
            case "HI":
                return 15;
            case "KA":
                return 16;
            default:
                throw new Error("Invalid koma kind");
        }
    } else {
        switch (kind) {
            case "FU":
                return 20;
            case "KY":
                return 21;
            case "KE":
                return 22;
            case "GI":
                return 23;
            case "KI":
                return 24;
            case "HI":
                return 25;
            case "KA":
                return 26;
            default:
                throw new Error("Invalid koma kind");
        }
    }
}
