import { useEffect, useState } from 'react'
import { Kifu } from './models/shogi'
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
  const [kifu, setKifu] = useState(() => {
    return new Kifu();
  });
  const [kifuVersion, setKifuVersion] = useState(0);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData('text/plain') ?? '';

      try {
        setKifu(Kifu.fromKif(text));
        setKifuVersion((version) => version + 1);
      } catch (error) {
        const emptyKifu = new Kifu();
        setKifu(emptyKifu);
        setKifuVersion((version) => version + 1);
        console.error('KIFの読み込みに失敗しました', error);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  return (
    <div className={APP_CONTAINER_STYLE}>
      <header className={HEADER_STYLE}>
        <h1 className={TITLE_STYLE}>
          Remote ShogiBan
        </h1>
        <p className={SUBTITLE_STYLE}>A modern shogi board interface</p>
      </header>
      <main className={MAIN_STYLE}>
        <ShogiBan key={kifuVersion} kifu={kifu} />
      </main>
      <footer className={FOOTER_STYLE}>
        &copy; 2026 Remote ShogiBan by Noy!
      </footer>
    </div>
  )
}

export default App
