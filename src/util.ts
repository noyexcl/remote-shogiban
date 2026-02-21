import type { KomaKind, Player } from "./models/shogi"

export function getKomaImageUrl(kind: KomaKind, reversed: boolean, owner?: Player): string {
    let name = '';
    switch (kind) {
        case 'FU': name = 'fu'; break;
        case 'KY': name = 'kyo'; break;
        case 'KE': name = 'kei'; break;
        case 'GI': name = 'gin'; break;
        case 'KI': name = 'kin'; break;
        case 'KA': name = 'kaku'; break;
        case 'HI': name = 'hi'; break;
        case 'OU': name = (owner === 'Gote') ? 'gyoku' : 'ou'; break;
        case 'FU+': name = 'to'; break;
        case 'KY+': name = 'nari_kyo'; break;
        case 'KE+': name = 'nari_kei'; break;
        case 'GI+': name = 'nari_kin'; break;
        case 'KA+': name = 'uma'; break;
        case 'HI+': name = 'ryu'; break;
        default: name = 'fu';
    }

    const suffix = reversed ? '_rev' : '';
    return `/koma/${name}${suffix}.png`;
}
