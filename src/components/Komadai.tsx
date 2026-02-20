import type { KomaDai, KomaKind, Player } from '../models/shogi';

interface KomadaiProps {
    owner: Player;
    komadai: KomaDai;
    selectedKind: KomaKind | null;
    onKomaClick: (kind: KomaKind) => void;
}

const KOMADAI_STYLE = "w-[120px] h-[582px] bg-[#d4a574] border-[3px] border-[#333] p-2 flex flex-col shadow-md max-sm:w-full max-sm:h-auto max-sm:flex-row max-sm:flex-wrap";
const ITEM_STYLE = "w-full h-[60px] flex items-center gap-2 mb-1 px-2 rounded cursor-pointer hover:bg-white/20 transition-colors max-sm:w-auto max-sm:mb-0";
const SELECTED_STYLE = "bg-yellow-400/50 ring-2 ring-red-500 hover:bg-yellow-400/60";
const ICON_CONTAINER_STYLE = "w-[45px] h-[45px] relative max-sm:w-[35px] max-sm:h-[35px]";
const COUNT_STYLE = "text-sm font-bold text-[#333] font-serif";

const ORDER: (keyof KomaDai)[] = ["HI", "KA", "KI", "GI", "KE", "KY", "FU"];

const Komadai = ({ owner, komadai, selectedKind, onKomaClick }: KomadaiProps) => {
    const displayOrder = owner === 'Sente' ? ORDER : [...ORDER].reverse();

    const getKomaImageUrl = (kind: KomaKind, player: Player): string => {
        const p = player.toLowerCase();
        let name = '';
        switch (kind) {
            case 'OU': name = p === 'sente' ? 'ou' : 'gyoku'; break;
            case 'HI': name = 'hi'; break;
            case 'KA': name = 'kaku'; break;
            case 'KI': name = 'kin'; break;
            case 'GI': name = 'gin'; break;
            case 'KE': name = 'kei'; break;
            case 'KY': name = 'kyo'; break;
            case 'FU': name = 'fu'; break;
            default: name = 'fu';
        }
        return `/koma/${name}_${p}.png`;
    };

    return (
        <div className={KOMADAI_STYLE} style={{ justifyContent: owner === 'Sente' ? 'flex-start' : 'flex-end' }}>
            <div className="flex flex-col w-full max-sm:flex-row max-sm:flex-wrap max-sm:justify-center">
                {displayOrder.map((kind) => {
                    const count = komadai[kind];
                    const isSelected = selectedKind === kind;

                    return (
                        <div
                            key={kind}
                            className={`${ITEM_STYLE} ${isSelected ? SELECTED_STYLE : ''} ${count === 0 ? 'opacity-30' : ''}`}
                            onClick={() => count > 0 && onKomaClick(kind)}
                        >
                            <div className={ICON_CONTAINER_STYLE}>
                                <img
                                    src={getKomaImageUrl(kind, owner)}
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

export default Komadai;
