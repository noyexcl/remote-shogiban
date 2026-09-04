import { describe, test, expect } from "vitest";
import { Kifu, Kyokumen, type Koma, type Masu } from "./shogi";


describe("SFEN format tests", () => {
    test("Start position", () => {
        const kyokumen = new Kyokumen();
        kyokumen.init();
        expect(kyokumen.toSFEN()).toBe("sfen lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1");
    });

    test("When komadai is not empty", () => {
        const kyokumen = new Kyokumen();
        kyokumen.init();
        setPiece(kyokumen.ban, 8, 2, null);
        setPiece(kyokumen.ban, 7, 2, { kind: "HI", owner: "Gote" });
        setPiece(kyokumen.ban, 2, 2, null);
        setPiece(kyokumen.ban, 8, 3, null);
        setPiece(kyokumen.ban, 7, 3, null);
        setPiece(kyokumen.ban, 3, 3, null);
        setPiece(kyokumen.ban, 7, 4, { kind: "FU", owner: "Sente" });
        setPiece(kyokumen.ban, 3, 4, { kind: "FU", owner: "Gote" });
        setPiece(kyokumen.ban, 8, 5, { kind: "FU", owner: "Sente" });
        setPiece(kyokumen.ban, 8, 7, null);
        setPiece(kyokumen.ban, 7, 7, null);
        setPiece(kyokumen.ban, 8, 8, { kind: "HI", owner: "Sente" });
        setPiece(kyokumen.ban, 2, 8, null);
        setPiece(kyokumen.ban, 7, 9, null);

        kyokumen.komadaiGote["KA"] = 1;
        kyokumen.komadaiGote["GI"] = 1;
        kyokumen.komadaiSente["KA"] = 1;
        kyokumen.komadaiSente["FU"] = 2;

        kyokumen.teban = "Gote";

        expect(kyokumen.toSFEN()).toBe("sfen lnsgkgsnl/2r6/p2ppp1pp/2P3p2/1P7/9/P2PPPPPP/1R7/LN1GKGSNL w B2Pbs 1");
    });

    test("Promoted pieces and captured piece", () => {
        const kifu = new Kifu();
        appendSashite(kifu, [], 7, 7, 7, 6, false);
        appendSashite(kifu, [0], 3, 3, 3, 4, false);
        appendSashite(kifu, [0, 0], 8, 8, 2, 2, true);

        const kyokumen = kifu.getKyokumen([0, 0, 0]);

        expect(kyokumen.toSFEN()).toBe("sfen lnsgkgsnl/1r5+B1/pppppp1pp/6p2/9/2P6/PP1PPPPPP/7R1/LNSGKGSNL w B 1");
    });
});

describe("USI format tests", () => {
    test("Startpos and no moves", () => {
        const kifu = new Kifu();
        expect(kifu.toUSI([])).toBe("position startpos moves");
    })

    test("Startpos and a few moves", () => {
        const kifu = new Kifu();
        appendSashite(kifu, [], 7, 7, 7, 6, false);
        appendSashite(kifu, [0], 3, 3, 3, 4, false);
        expect(kifu.toUSI([0, 0])).toBe("position startpos moves 7g7f 3c3d");
    })

    test("Different startpos and a few moves", () => {
        const kifu = new Kifu();
        setPiece(kifu.startKyokumen.ban, 2, 8, null);
        setPiece(kifu.startKyokumen.ban, 5, 8, { kind: "HI", owner: "Sente" });
        setPiece(kifu.startKyokumen.ban, 5, 7, null);
        setPiece(kifu.startKyokumen.ban, 5, 6, { kind: "FU", owner: "Sente" });
        setPiece(kifu.startKyokumen.ban, 3, 3, null);
        setPiece(kifu.startKyokumen.ban, 3, 4, { kind: "FU", owner: "Gote" });
        kifu.startKyokumen.teban = "Gote"
        appendSashite(kifu, [], 4, 3, 4, 4, false);

        expect(kifu.toUSI([0])).toBe("position sfen lnsgkgsnl/1r5b1/pppppp1pp/6p2/9/4P4/PPPP1PPPP/1B2R4/LNSGKGSNL w - 1 moves 4c4d");
    })

    test("Promotional move", () => {
        const kifu = new Kifu();
        appendSashite(kifu, [], 7, 7, 7, 6, false);
        appendSashite(kifu, [0], 3, 3, 3, 4, false);
        appendSashite(kifu, [0, 0], 8, 8, 2, 2, true);
        expect(kifu.toUSI([0, 0, 0])).toBe("position startpos moves 7g7f 3c3d 8h2b+");
    })

    test("Piece drop", () => {
        const kifu = new Kifu();
        appendSashite(kifu, [], 7, 7, 7, 6, false);
        appendSashite(kifu, [0], 3, 3, 3, 4, false);
        appendSashite(kifu, [0, 0], 8, 8, 2, 2, true);
        appendSashite(kifu, [0, 0, 0], 3, 1, 2, 2, false);
        appendSashite(kifu, [0, 0, 0, 0], 15, 0, 4, 4, false);
        expect(kifu.toUSI([0, 0, 0, 0, 0])).toBe("position startpos moves 7g7f 3c3d 8h2b+ 3a2b B*4d");
    })
})

describe("getSashiteList tests", () => {
    test("Start position returns only 開始局面", () => {
        const kifu = new Kifu();
        const [list, branchList] = kifu.getSashiteList(Array(500).fill(0));
        expect(list).toEqual(["開始局面"]);
        expect(branchList).toEqual({});
    });

    test("Sequential moves along main branch", () => {
        const kifu = new Kifu();
        appendSashite(kifu, [], 7, 7, 7, 6, false);
        appendSashite(kifu, [0], 3, 3, 3, 4, false);
        appendSashite(kifu, [0, 0], 8, 8, 2, 2, true);

        const [list, branchList] = kifu.getSashiteList(Array(500).fill(0));
        expect(list).toEqual(["開始局面", "７六歩", "３四歩", "２二角成"]);
        expect(branchList).toEqual({});
    });

    test("Branching moves record branchList and reflect active path", () => {
        const kifu = new Kifu();
        // Move 1: 7七歩 -> 7六歩 (branch 0)
        appendSashite(kifu, [], 7, 7, 7, 6, false);
        // Move 1 branch: 2七歩 -> 2六歩 (branch 1)
        appendSashite(kifu, [], 2, 7, 2, 6, false);

        // Path following branch 0
        const path0 = Array(500).fill(0);
        const [list0, branchList0] = kifu.getSashiteList(path0);
        expect(list0).toEqual(["開始局面", "７六歩"]);
        expect(branchList0[0]).toEqual(["７六歩", "２六歩"]);

        // Path following branch 1
        const path1 = [1, ...Array(499).fill(0)];
        const [list1, branchList1] = kifu.getSashiteList(path1);
        expect(list1).toEqual(["開始局面", "２六歩"]);
        expect(branchList1[0]).toEqual(["７六歩", "２六歩"]);
    });
});

/** For setting up test kifu by hand, it's a bit tricky to use indices to represent moves, so we have this helper function
*/
function appendSashite(kifu: Kifu, path: number[], fromSuji: number, fromDan: number, toSuji: number, toDan: number, promote: boolean) {
    let fromRow = fromDan - 1;
    const fromCol = 9 - fromSuji;
    const toRow = toDan - 1;
    const toCol = 9 - toSuji;

    if (fromSuji >= 10) {
        fromRow = fromSuji;
    }

    kifu.addSashite(path, fromRow, fromCol, toRow, toCol, promote);
}


/** For setting up test kyokumen by hand, it's a bit tricky to use indices to represent moves, so we have this helper function
 */
function setPiece(ban: Masu[][], suji: number, dan: number, koma: Koma | null) {
    ban[dan - 1][9 - suji] = koma;
}

