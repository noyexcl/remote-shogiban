import { describe, test, expect, vi, afterEach } from "vitest";
import { streamEval } from "./aiClient";
import { Kyokumen } from "../models/shogi";
import type { EvalInfo } from "../models/eval";

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("streamEval", () => {
    test("yields parsed EvalInfo for each SSE event", async () => {
        const body = [
            'data: {"depth":1,"score":{"type":"cp","value":54},"pv":["7g7f"],"nodes":100,"nps":500}',
            "",
            'data: {"depth":2,"score":{"type":"cp","value":67},"pv":["7g7f","3c3d"],"nodes":200}',
            "",
        ].join("\n");
        mockFetch(body);

        const kyokumen = new Kyokumen();
        kyokumen.init();

        const received: EvalInfo[] = [];
        for await (const info of streamEval(kyokumen)) {
            received.push(info);
        }

        expect(received).toHaveLength(2);
        expect(received[0]).toEqual({
            depth: 1,
            score: { type: "cp", value: 54 },
            pv: ["7g7f"],
            nodes: 100,
            nps: 500,
        });
        expect(received[1]).toEqual({
            depth: 2,
            score: { type: "cp", value: 67 },
            pv: ["7g7f", "3c3d"],
            nodes: 200,
        });
    });

    test("parses events split across stream chunks", async () => {
        const event1 = 'data: {"depth":1,"score":{"type":"cp","value":-30}}';
        const event2 = 'data: {"depth":2,"score":{"type":"mate","value":3}}';
        const full = `${event1}\n\n${event2}\n\n`;
        mockFetchChunks([full.slice(0, 23), full.slice(23, 50), full.slice(50)]);

        const kyokumen = new Kyokumen();
        kyokumen.init();

        const received: EvalInfo[] = [];
        for await (const info of streamEval(kyokumen)) {
            received.push(info);
        }

        expect(received).toEqual([
            { depth: 1, score: { type: "cp", value: -30 } },
            { depth: 2, score: { type: "mate", value: 3 } },
        ]);
    });

    test("ignores non-data lines and malformed JSON", async () => {
        const body = [
            "event: info",
            'data: {"depth":1}',
            "",
            ": heartbeat",
            "",
            "data: not-json",
            "",
            'data: {"depth":3}',
            "",
        ].join("\n");
        mockFetch(body);

        const kyokumen = new Kyokumen();
        kyokumen.init();

        const received: EvalInfo[] = [];
        for await (const info of streamEval(kyokumen)) {
            received.push(info);
        }

        expect(received).toEqual([{ depth: 1 }, { depth: 3 }]);
    });

    test("parses the last event when stream ends without a trailing blank line", async () => {
        mockFetch('data: {"depth":4,"score":{"type":"cp","value":12}}');

        const kyokumen = new Kyokumen();
        kyokumen.init();

        const received: EvalInfo[] = [];
        for await (const info of streamEval(kyokumen)) {
            received.push(info);
        }

        expect(received).toEqual([{ depth: 4, score: { type: "cp", value: 12 } }]);
    });

    test("throws when the response is not ok", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => new Response("Internal Server Error", { status: 500 })));

        const kyokumen = new Kyokumen();
        kyokumen.init();

        const iterator = streamEval(kyokumen);
        await expect(() => iterator.next()).rejects.toThrow("AIサーバーエラー");
    });
});

function mockFetch(body: string) {
    vi.stubGlobal("fetch", vi.fn(async () => {
        const encoder = new TextEncoder();
        return new Response(encoder.encode(body), {
            status: 200,
            headers: { "Content-Type": "text/event-stream" },
        });
    }));
}

function mockFetchChunks(chunks: string[]) {
    vi.stubGlobal("fetch", vi.fn(async () => {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            start(controller) {
                for (const chunk of chunks) {
                    controller.enqueue(encoder.encode(chunk));
                }
                controller.close();
            },
        });
        return new Response(stream, {
            status: 200,
            headers: { "Content-Type": "text/event-stream" },
        });
    }));
}
