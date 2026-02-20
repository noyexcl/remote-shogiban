import type { KomaKind } from "./models/shogi"

export function getKomaImageUrl(kind: KomaKind, reversed: boolean): string {
    let name = '';
    switch (kind) {
        case 'HI': name = 'hi'; break;
        case 'KA': name = 'kaku'; break;
        case 'KI': name = 'kin'; break;
        case 'GI': name = 'gin'; break;
        case 'KE': name = 'kei'; break;
        case 'KY': name = 'kyo'; break;
        case 'FU': name = 'fu'; break;
        default: name = 'fu';
    }
    const suffix = reversed ? '_rev' : '';
    return `/koma/${name}${suffix}.png`;
}