import { useState } from 'react';
import { Kyokumen } from '../models/shogi';
import type { Kifu, Koma } from "../models/shogi"

interface ShogiBanProps {
    kifu: Kifu;
}

const BOARD_STYLE = "inline-grid grid-cols-[repeat(9,60px)] grid-rows-[repeat(9,60px)] gap-px \
border-[3px] border-[#333] bg-[#d4a574] p-2.5 shadow-md max-sm:grid-cols-[repeat(9,40px)] max-sm:grid-rows-[repeat(9,40px)]";

const MASU_STYLE = "w-[60px] h-[60px] bg-[#e8dcc8] border border-[#999] flex items-center justify-center relative \
cursor-default hover:bg-[#f0e8d8] max-sm:w-[40px] max-sm:h-[40px]";

const LIST_STYLE = "w-[200px] h-[558px] bg-[#f5f5f5] border border-[#ccc] ml-4 overflow-y-auto flex flex-col max-sm:w-full max-sm:ml-0 max-sm:mt-4 max-sm:h-[200px]";
const LIST_ITEM_STYLE = "p-2 border-b border-[#eee] cursor-pointer hover:bg-[#eee] text-sm flex items-center";
const LIST_ITEM_SELECTED_STYLE = "bg-[#fff0b3] font-bold";
const LIST_INDEX_STYLE = "w-10 text-stone-400 text-xs";

const MASU_SELECTED_STYLE = "!bg-[#ffcc00] !border-2 !border-[#ff0000]";
const MASU_LAST_MOVE_FROM_STYLE = "!bg-cyan-100/60";
const MASU_LAST_MOVE_TO_STYLE = "!bg-cyan-200/80";

const PIECE_CONTAINER_STYLE = "w-[55px] h-[55px] absolute cursor-grab select-none active:cursor-grabbing group max-sm:w-[38px] max-sm:h-[38px]";



const ShogiBan = ({ kifu }: ShogiBanProps) => {
    const [selected, setSelected] = useState<[number, number] | null>(null);
    const [tesuu, setTesuu] = useState<number>(0);
    const [path, setPath] = useState<number[]>(Array(500).fill(0));
    const [kyokumen, setKyokumen] = useState<Kyokumen>(kifu.getKyokumen([]));

    const handleMasuClick = (row: number, col: number) => {
        const targetKoma = kyokumen.ban[row][col];
        const isOwnPiece = targetKoma?.owner === kyokumen.teban;

        if (isOwnPiece) {
            // 1. Select own piece (or switch selection)
            setSelected([row, col]);
        } else if (selected) {
            // 2. Try to move
            const [selRow, selCol] = selected;
            try {
                const [legal, canPromote] = kifu.isLegal(path.slice(0, tesuu), selRow, selCol, row, col);
                // TODO: show promote dialog if canPromote is true

                if (legal) {
                    const nextBranchIdx = kifu.addSashite(path.slice(0, tesuu), selRow, selCol, row, col, false);

                    if (nextBranchIdx !== path[tesuu]) {
                        switchPath(path, tesuu, nextBranchIdx);
                        setPath(path);
                    }

                    setSelected(null);
                    setTesuu(tesuu + 1);
                    setKyokumen(kifu.getKyokumen(path.slice(0, tesuu + 1)));

                } else {
                    // Invalid move, ignore (or could show feedback)
                }
            } catch (e) {
                console.error(e);
                // Also invalid move
            }
        }
        // 3. If empty/opponent and no selection -> do nothing (handled by default)
    };

    const handleListClick = (index: number) => {
        setTesuu(index);
        setKyokumen(kifu.getKyokumen(path.slice(0, index)));
        setSelected(null);
    };

    const handleBranchClick = (branchIdx: number) => {
        if (branchIdx !== path[tesuu]) {
            switchPath(path, tesuu, branchIdx);
            setPath(path);
        }

        setTesuu(tesuu + 1);
        setKyokumen(kifu.getKyokumen(path.slice(0, tesuu + 1)));
        setSelected(null);
    };

    const [sashiteList, branchMap] = kifu.getSashiteList(path);
    const currentBranches = branchMap[tesuu] || [];

    const getKomaImageUrl = (koma: Koma): string => {
        const owner = koma.owner.toLowerCase(); // 'sente' or 'gote'
        let name = '';

        if (koma.promoted) {
            switch (koma.kind) {
                case 'HI': name = 'ryu'; break;
                case 'KA': name = 'uma'; break;
                case 'FU': name = 'to'; break;
                case 'KY': name = owner === 'sente' ? 'nari_kyou' : 'nari_kyo'; break;
                case 'KE': name = 'nari_kei'; break;
                case 'GI': name = 'nari_kin'; break; // Assuming nari_kin is for GI promotion
                default: name = 'nari_kin'; // Fallback
            }
        } else {
            switch (koma.kind) {
                case 'OU': name = owner === 'sente' ? 'ou' : 'gyoku'; break;
                case 'HI': name = 'hi'; break;
                case 'KA': name = 'kaku'; break;
                case 'KI': name = 'kin'; break;
                case 'GI': name = 'gin'; break;
                case 'KE': name = 'kei'; break;
                case 'KY': name = 'kyo'; break;
                case 'FU': name = 'fu'; break;
            }
        }

        return `/koma/${name}_${owner}.png`;
    };

    const renderKoma = (koma: Koma | null) => {
        if (!koma) return null;

        return (
            <div
                className={PIECE_CONTAINER_STYLE}
                title={`${koma.owner} ${koma.kind}${koma.promoted ? '+' : ''}`}
            >
                <img
                    src={getKomaImageUrl(koma)}
                    alt={koma.kind}
                    className="w-full h-full object-contain"
                />
            </div>
        );
    };

    return (
        <div className="flex flex-wrap items-start justify-center">
            <div className={BOARD_STYLE}>
                {kyokumen.ban.map((row, rowIdx) => (
                    <div key={rowIdx} className="contents">
                        {row.map((masu, colIdx) => {
                            const isSelected = selected?.[0] === rowIdx && selected?.[1] === colIdx;
                            const selectedClass = isSelected ? MASU_SELECTED_STYLE : '';

                            const isLastMoveFrom = kyokumen.lastSashite?.fromRow === rowIdx && kyokumen.lastSashite?.fromCol === colIdx;
                            const isLastMoveTo = kyokumen.lastSashite?.toRow === rowIdx && kyokumen.lastSashite?.toCol === colIdx;
                            const lastSashiteClass = isLastMoveTo ? MASU_LAST_MOVE_TO_STYLE : isLastMoveFrom ? MASU_LAST_MOVE_FROM_STYLE : '';

                            return (
                                <div
                                    key={`${rowIdx}-${colIdx}`}
                                    className={`${MASU_STYLE} ${selectedClass} ${lastSashiteClass}`}
                                    onClick={() => handleMasuClick(rowIdx, colIdx)}
                                >
                                    {renderKoma(masu)}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            <div className={LIST_STYLE}>
                <div className="p-2 border-b border-[#ccc] bg-[#eee] font-bold text-sm flex items-center justify-between sticky top-0">
                    棋譜
                </div>
                {sashiteList.map((s, i) => (
                    <div
                        key={i}
                        className={`${LIST_ITEM_STYLE} ${i === tesuu ? LIST_ITEM_SELECTED_STYLE : ''} ${path[i] !== 0 ? 'bg-red-500' : ''}`}
                        onClick={() => handleListClick(i)}
                    >
                        <span className={LIST_INDEX_STYLE}>{i}</span>
                        <span>{s}</span>
                        {i in branchMap && i !== sashiteList.length - 1 && (
                            <span className="ml-auto text-[10px] bg-sky-500 text-white px-1 rounded-sm">次分岐</span>
                        )}
                    </div>
                ))}
            </div>

            <div className={`${LIST_STYLE} border-l-0 ${currentBranches.length === 0 ? 'opacity-30 pointer-events-none' : ''}`}>
                <div className="p-2 border-b border-[#ccc] bg-sky-900 text-white font-bold text-sm flex items-center justify-between sticky top-0">
                    変化・分岐
                </div>
                {currentBranches.map((s, i) => (
                    <div
                        key={i}
                        className={`${LIST_ITEM_STYLE} ${path[tesuu] === i || (!path[tesuu] && i === 0) ? 'bg-sky-100 font-semibold' : ''}`}
                        onClick={() => handleBranchClick(i)}
                    >
                        <span className={LIST_INDEX_STYLE}>{i + 1}</span>
                        <span>{s}</span>
                    </div>
                ))}
                {currentBranches.length === 0 && (
                    <div className="p-4 text-stone-400 text-xs text-center italic">
                        選択中の手に分岐はありません
                    </div>
                )}
            </div>
        </div>
    );
};

function switchPath(path: number[], at: number, idx: number) {
    path[at] = idx;

    for (let i = at + 1; i < path.length; i++) {
        path[i] = 0;
    }

    return path;
}


export default ShogiBan;
