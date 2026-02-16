import { useState } from 'react'
import { Kifu, Kyokumen } from './models/shogi'
import ShogiBan from './components/ShogiBan'


const APP_CONTAINER_STYLE = "min-h-screen flex flex-col items-center py-12 \
bg-stone-100 font-sans text-stone-800";

const HEADER_STYLE = "mb-10 text-center";

const TITLE_STYLE = "text-4xl font-extrabold tracking-tight text-stone-900 drop-shadow-sm";

const SUBTITLE_STYLE = "mt-2 text-stone-600";

const MAIN_STYLE = "p-8 rounded-2xl shadow-xl \
bg-white border border-stone-200";

const FOOTER_STYLE = "mt-12 text-sm text-stone-500";

function App() {
  const [kifu] = useState(() => {
    return new Kifu();
  });

  return (
    <div className={APP_CONTAINER_STYLE}>
      <header className={HEADER_STYLE}>
        <h1 className={TITLE_STYLE}>
          Remote Shogi Ban
        </h1>
        <p className={SUBTITLE_STYLE}>A modern shogi board interface</p>
      </header>
      <main className={MAIN_STYLE}>
        <ShogiBan kifu={kifu} />
      </main>
      <footer className={FOOTER_STYLE}>
        &copy; 2026 Remote Shogi Ban
      </footer>
    </div>
  )
}

export default App
