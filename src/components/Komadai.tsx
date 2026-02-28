import type { KomaDaiData, KomaKind } from '../models/shogi';
import { getKomaImageUrl } from '../util';
import type { Player } from '../models/shogi';

interface KomadaiProps {
    owner: Player;
    komadai: KomaDaiData;
    selectedKind: [KomaKind, Player] | null;
    onKomaClick: (kind: KomaKind, owner: Player) => void;
    reversed: boolean;
}

const KOMADAI_STYLE = "w-[120px] h-[582px] bg-[#d4a574] border-[3px] border-[#333] p-2 flex flex-col shadow-md max-sm:w-full max-sm:h-auto max-sm:flex-row max-sm:flex-wrap";
const ITEM_STYLE = "w-full h-[60px] flex items-center gap-2 mb-1 px-2 rounded cursor-pointer hover:bg-white/20 transition-colors max-sm:w-auto max-sm:mb-0";
const SELECTED_STYLE = "bg-yellow-400/50 ring-2 ring-red-500 hover:bg-yellow-400/60";
const ICON_CONTAINER_STYLE = "w-[45px] h-[45px] relative max-sm:w-[35px] max-sm:h-[35px]";
const COUNT_STYLE = "text-sm font-bold text-[#333] font-serif";

const ORDER: (keyof KomaDaiData)[] = ["HI", "KA", "KI", "GI", "KE", "KY", "FU"];

export const KomaDai = ({ owner, komadai, selectedKind, onKomaClick, reversed }: KomadaiProps) => {
    const displayOrder = reversed ? [...ORDER].reverse() : ORDER;

    return (
        <div className={KOMADAI_STYLE} style={{ justifyContent: reversed ? 'flex-end' : 'flex-start' }}>
            <div className="flex flex-col w-full max-sm:flex-row max-sm:flex-wrap max-sm:justify-center">
                {displayOrder.map((kind) => {
                    const count = komadai[kind];
                    const isSelected = selectedKind?.[0] === kind;

                    return (
                        <div
                            key={kind}
                            className={`${ITEM_STYLE} ${isSelected ? SELECTED_STYLE : ''} ${count === 0 ? 'opacity-30' : ''}`}
                            onClick={() => count > 0 && onKomaClick(kind, owner)}
                        >
                            <div className={ICON_CONTAINER_STYLE}>
                                <img
                                    src={getKomaImageUrl(kind, reversed, owner)}
                                    alt={kind}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <span className={COUNT_STYLE}>
                                {count > 1 ? `×${count}` : ''}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default KomaDai;
