import { useState, useEffect, useCallback, useMemo } from 'react';
import { getFromRow, isMandatoryPromotion, Kyokumen } from '../models/shogi';
import type { Kifu, Koma, KomaKind, Player } from "../models/shogi"
import { Komadai } from './Komadai';
import { getKomaImageUrl } from '../util';

interface ShogibanProps {
    kifu: Kifu;
}

const BOARD_STYLE = "grid grid-cols-[repeat(9,60px)] grid-rows-[repeat(9,60px)] gap-px \
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

const CONTEXT_MENU_STYLE = "fixed bg-white border border-[#ccc] shadow-lg rounded-sm py-1 z-50 min-w-[120px] text-sm";
const CONTEXT_MENU_ITEM_STYLE = "px-4 py-1.5 cursor-pointer hover:bg-sky-50 transition-colors flex items-center gap-2";

const PIECE_CONTAINER_STYLE = "w-[55px] h-[55px] absolute cursor-grab select-none active:cursor-grabbing group max-sm:w-[38px] max-sm:h-[38px]";

const Shogiban = ({ kifu }: ShogibanProps) => {
    const [selected, setSelected] = useState<[number, number] | null>(null);
    const [selectedKomadai, setSelectedKomadai] = useState<[KomaKind, Player] | null>(null);
    const [tesuu, setTesuu] = useState<number>(0);
    const [path, setPath] = useState<number[]>(Array(500).fill(0));
    const [kyokumen, setKyokumen] = useState<Kyokumen>(kifu.getKyokumen([]));
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, targetTesuu: number } | null>(null);
    const [reversed, setReversed] = useState<boolean>(true);
    const [pendingPromotion, setPendingPromotion] = useState<{ fromRow: number, fromCol: number, toRow: number, toCol: number } | null>(null);

    const closeContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    useEffect(() => {
        if (contextMenu) {
            window.addEventListener('click', closeContextMenu);
            return () => window.removeEventListener('click', closeContextMenu);
        }
    }, [contextMenu, closeContextMenu]);

    const handleKifuContextMenu = (e: React.MouseEvent, targetTesuu: number) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            targetTesuu
        });
    };

    const handleMasuClick = (row: number, col: number) => {
        const targetKoma = kyokumen.ban[row][col];
        const isOwnPiece = targetKoma?.owner === kyokumen.teban;

        if (isOwnPiece) {
            // 1. Select own piece (or switch selection)
            setSelected([row, col]);
            setSelectedKomadai(null);
        } else if (selected) {
            // 2. Try to move from board
            const [selRow, selCol] = selected;
            const [legal, canPromote] = kifu.isLegal(path.slice(0, tesuu), selRow, selCol, row, col);

            if (legal) {
                if (canPromote) {
                    const koma = kyokumen.ban[selRow][selCol]!;
                    if (isMandatoryPromotion(koma, row)) {
                        executeMove(selRow, selCol, row, col, true);
                    } else {
                        setPendingPromotion({ fromRow: selRow, fromCol: selCol, toRow: row, toCol: col });
                    }
                } else {
                    executeMove(selRow, selCol, row, col, false);
                }
            } else {
                // Invalid move
                setSelected(null);
            }
        }
    };

    const executeMove = (fRow: number, fCol: number, tRow: number, tCol: number, promote: boolean) => {
        const nextBranchIdx = kifu.addSashite(path.slice(0, tesuu), fRow, fCol, tRow, tCol, promote);

        if (nextBranchIdx !== path[tesuu]) {
            switchPath(path, tesuu, nextBranchIdx);
            setPath([...path]);
        }

        setSelected(null);
        setSelectedKomadai(null);
        setTesuu(tesuu + 1);
        setKyokumen(kifu.getKyokumen(path.slice(0, tesuu + 1)));
        setPendingPromotion(null);
    };

    const handleKomadaiClick = (kind: KomaKind, owner: Player) => {
        if (kyokumen.teban !== owner) return;

        const fromRow = getFromRow(kind, owner);
        setSelected([fromRow, 0]);
        setSelectedKomadai([kind, owner]);
    };

    const handleListClick = (index: number) => {
        setTesuu(index);
        setKyokumen(kifu.getKyokumen(path.slice(0, index)));
        setSelected(null);
        setSelectedKomadai(null);
    };

    const handleBranchClick = (branchIdx: number) => {
        if (branchIdx !== path[tesuu]) {
            switchPath(path, tesuu, branchIdx);
            setPath([...path]);
        }

        setTesuu(tesuu + 1);
        setKyokumen(kifu.getKyokumen(path.slice(0, tesuu + 1)));
        setSelected(null);
        setSelectedKomadai(null);
    };

    const handleDeleteSashite = (targetTesuu: number) => {
        if (targetTesuu === 0) return;
        kifu.removeSashite(path.slice(0, targetTesuu));
        if (targetTesuu <= tesuu) {
            setTesuu(targetTesuu - 1);
            setKyokumen(kifu.getKyokumen(path.slice(0, targetTesuu - 1)));
        }
        switchPath(path, targetTesuu - 1, 0);
        setPath([...path]);
        setSelected(null);
        setSelectedKomadai(null);
    }

    const [sashiteList, branchMap] = useMemo(() => kifu.getSashiteList(path), [kifu, path, kyokumen]);
    const currentBranches = branchMap[tesuu] || [];

    const renderKoma = (koma: Koma | null) => {
        if (!koma) return null;

        const r = (reversed && koma.owner === 'Sente') || (!reversed && koma.owner === 'Gote');

        return (
            <div className={PIECE_CONTAINER_STYLE} title={`${koma.owner} ${koma.kind}${koma.promoted ? '+' : ''}`}>
                <img src={getKomaImageUrl(koma.kind, r, koma.owner)} alt={koma.kind} className="w-full h-full object-contain" />
            </div>
        );
    };

    return (
        <div className="flex flex-wrap items-start justify-center gap-4 p-4">
            <div className="flex flex-row items-stretch gap-2">
                <Komadai
                    owner={reversed ? "Sente" : "Gote"}
                    komadai={reversed ? kyokumen.komadaiSente : kyokumen.komadaiGote}
                    selectedKind={selectedKomadai?.[1] === (reversed ? "Sente" : "Gote") ? selectedKomadai : null}
                    onKomaClick={handleKomadaiClick}
                    reversed
                />

                <div className={BOARD_STYLE}>
                    {Array.from({ length: 9 }).map((_, rIdx) => {
                        const rowIdx = reversed ? 8 - rIdx : rIdx;
                        const row = kyokumen.ban[rowIdx];
                        return (
                            <div key={rowIdx} className="contents">
                                {Array.from({ length: 9 }).map((_, cIdx) => {
                                    const colIdx = reversed ? 8 - cIdx : cIdx;
                                    const masu = row[colIdx];
                                    const isSelected = selected?.[0] === rowIdx && selected?.[1] === colIdx;
                                    const selectedClass = isSelected ? MASU_SELECTED_STYLE : '';
                                    const isLastMoveFrom = kyokumen.lastFromRow === rowIdx && kyokumen.lastFromCol === colIdx;
                                    const isLastMoveTo = kyokumen.lastToRow === rowIdx && kyokumen.lastToCol === colIdx;
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
                        );
                    })}
                </div>

                <Komadai
                    owner={reversed ? "Gote" : "Sente"}
                    komadai={reversed ? kyokumen.komadaiGote : kyokumen.komadaiSente}
                    selectedKind={selectedKomadai?.[1] === (reversed ? "Gote" : "Sente") ? selectedKomadai : null}
                    onKomaClick={handleKomadaiClick}
                    reversed={false}
                />
            </div>

            <div className="flex flex-col gap-4">
                <button
                    onClick={() => setReversed(!reversed)}
                    className="px-4 py-2 bg-stone-700 text-white rounded hover:bg-stone-600 transition-colors shadow-sm font-bold"
                >
                    盤面を反転
                </button>
                <div className={LIST_STYLE}>
                    <div className="p-2 border-b border-[#ccc] bg-[#eee] font-bold text-sm flex items-center justify-between sticky top-0">
                        棋譜
                    </div>
                    {sashiteList.map((s, i) => (
                        <div
                            key={i}
                            className={`${LIST_ITEM_STYLE} ${i === tesuu ? LIST_ITEM_SELECTED_STYLE : ''}`}
                            onClick={() => handleListClick(i)}
                            onContextMenu={(e) => handleKifuContextMenu(e, i)}
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

            {contextMenu && (
                <div
                    className={CONTEXT_MENU_STYLE}
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div
                        className={CONTEXT_MENU_ITEM_STYLE}
                        onClick={() => {
                            handleDeleteSashite(contextMenu.targetTesuu);
                            closeContextMenu();
                        }}
                    >
                        <span className="text-red-600">指し手削除</span>
                    </div>
                </div>
            )}

            {pendingPromotion && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
                    <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center gap-4">
                        <div className="text-lg font-bold">成りますか？</div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => executeMove(pendingPromotion.fromRow, pendingPromotion.fromCol, pendingPromotion.toRow, pendingPromotion.toCol, true)}
                                className="px-6 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 font-bold transition-colors"
                            >
                                成る
                            </button>
                            <button
                                onClick={() => executeMove(pendingPromotion.fromRow, pendingPromotion.fromCol, pendingPromotion.toRow, pendingPromotion.toCol, false)}
                                className="px-6 py-2 bg-stone-200 text-stone-700 rounded hover:bg-stone-300 font-bold transition-colors"
                            >
                                成らない
                            </button>
                        </div>
                    </div>
                </div>
            )}
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

export default Shogiban;
