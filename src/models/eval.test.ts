import { describe, test, expect } from "vitest";
import { toSentePerspective } from "./eval";

describe("toSentePerspective", () => {
    test("Sente番ではスコアをそのまま返す", () => {
        expect(toSentePerspective({ type: "cp", value: 120 }, "Sente")).toEqual({ type: "cp", value: 120 });
        expect(toSentePerspective({ type: "mate", value: -3 }, "Sente")).toEqual({ type: "mate", value: -3 });
    });

    test("Gote番ではcpスコアの符号を反転する", () => {
        expect(toSentePerspective({ type: "cp", value: 120 }, "Gote")).toEqual({ type: "cp", value: -120 });
        expect(toSentePerspective({ type: "cp", value: -80 }, "Gote")).toEqual({ type: "cp", value: 80 });
    });

    test("Gote番ではmateスコアの符号を反転する", () => {
        expect(toSentePerspective({ type: "mate", value: 3 }, "Gote")).toEqual({ type: "mate", value: -3 });
        expect(toSentePerspective({ type: "mate", value: -5 }, "Gote")).toEqual({ type: "mate", value: 5 });
    });

    test("元のスコアオブジェクトは変更しない", () => {
        const score = { type: "cp" as const, value: 100 };
        toSentePerspective(score, "Gote");
        expect(score).toEqual({ type: "cp", value: 100 });
    });
});
