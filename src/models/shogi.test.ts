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

describe("KIF parsing tests", () => {
    test("Parses a standard KIF main line", () => {
        const kifu = Kifu.fromKif(`手合割：平手

手数----指手---------消費時間--
   1 ７六歩(77)   ( 0:00/00:00:00)
* 初手のコメント
   2 ３四歩(33)   ( 0:00/00:00:00)
   3 ２六歩(27)   ( 0:00/00:00:00)
   4 ８四歩(83)   ( 0:00/00:00:00)
`);

        expect(kifu.toUSI([0, 0, 0, 0])).toBe("position startpos moves 7g7f 3c3d 2g2f 8c8d");
        expect(kifu.getSashite([0]).comment).toBe("初手のコメント");
    });

    test("Parses promotion, drops, 同, and comments", () => {
        const kifu = Kifu.fromKif(`手合割：平手
手数----指手---------消費時間--
   1 ７六歩(77)
   2 ３四歩(33)
   3 ２二角成(88)
   4 ２二銀(31)
`);

        const promotedPosition = kifu.getKyokumen([0, 0, 0]);
        expect(promotedPosition.ban[1][7]).toEqual({ kind: "KA+", owner: "Sente" });
        const finalKyokumen = kifu.getKyokumen([0, 0, 0, 0]);
        expect(finalKyokumen.ban[1][7]).toEqual({ kind: "GI", owner: "Gote" });
        expect(kifu.toUSI([0, 0, 0, 0])).toContain("8h2b+");
    });

    test("Parses 同 and a piece drop", () => {
        const kifu = Kifu.fromKif(`手合割：平手
手数----指手---------消費時間--
   1 ７六歩(77)
   2 ３四歩(33)
   3 ２六歩(27)
   4 ８四歩(83)
   5 ２五歩(26)
   6 ８五歩(84)
   7 ７八金(69)
   8 ３二金(41)
   9 ２四歩(25)
  10 同歩(23)
  11 同飛(28)
`);

        const finalKyokumen = kifu.getKyokumen(Array(11).fill(0));
        expect(finalKyokumen.ban[3][7]).toEqual({ kind: "HI", owner: "Sente" });

        const dropKifu = Kifu.fromKif(`手合割：平手
手数----指手---------消費時間--
   1 ７六歩(77)
   2 ３四歩(33)
   3 ２二角成(88)
   4 ２二銀(31)
   5 ４四角打
`);
        const dropPosition = dropKifu.getKyokumen(Array(5).fill(0));
        expect(dropPosition.ban[3][5]).toEqual({ kind: "KA", owner: "Sente" });
        expect(dropPosition.komadaiSente.KA).toBe(0);
    });

    test("Rejects malformed KIF", () => {
        expect(() => Kifu.fromKif("手合割：平手\n手数----指手---------消費時間--\n   1 ７六歩")).toThrow();
    });

    test("Parses a variation from the indicated move number", () => {
        const kifu = Kifu.fromKif(`手合割：平手
先手：
後手：
手数----指手---------消費時間--
   1 ７六歩(77)        ( 0:00/00:00:00)
   2 ３四歩(33)        ( 0:00/00:00:00)

変化：2手
   2 ８四歩(83)        ( 0:00/00:00:00)
   3 ２六歩(27)        ( 0:00/00:00:00)
   4 ８五歩(84)        ( 0:00/00:00:00)
* コメント
   5 ７七角(88)        ( 0:00/00:00:00)
`);

        expect(kifu.root.next).toHaveLength(1);
        expect(kifu.root.next[0].next).toHaveLength(2);
        expect(kifu.toUSI([0, 0])).toBe("position startpos moves 7g7f 3c3d");
        expect(kifu.toUSI([0, 1, 0, 0, 0])).toBe("position startpos moves 7g7f 8c8d 2g2f 8d8e 8h7g");
        expect(kifu.getSashite([0, 1, 0, 0]).comment).toBe("コメント");
    });

    test("Rejects a variation whose starting position does not exist", () => {
        expect(() => Kifu.fromKif(`手合割：平手
手数----指手---------消費時間--
   1 ７六歩(77)

変化：3手
   3 ２六歩(27)
`)).toThrow("変化の開始位置が存在しません");
    });

    test("Parses multiple variations from the same move number", () => {
        const kifu = Kifu.fromKif(`手合割：平手
手数----指手---------消費時間--
   1 ７六歩(77)
   2 ３四歩(33)

変化：2手
   2 ８四歩(83)

変化：2手
   2 ４四歩(43)
   3 ７八金(69)
`);

        expect(kifu.root.next[0].next).toHaveLength(3);
        expect(kifu.toUSI([0, 2, 0])).toBe("position startpos moves 7g7f 4c4d 6i7h");
    });
});

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

