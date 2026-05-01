import bunnyUrl from "./bunny.png";

export function About() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-[#1a1a1a] px-6 py-8 text-[#fff5e6] font-sans select-none">
      <img src={bunnyUrl} alt="Hello Electrobun" className="h-20 w-20 drop-shadow-lg" />
      <h1 className="text-2xl font-bold">Hello, Electrobun</h1>
      <p className="text-sm text-[#fff5e6]/70">Minimal portable Electrobun app</p>
      <a
        href="https://kortexa.ai"
        target="_blank"
        rel="noreferrer"
        className="text-xs text-[#ff8a00] underline hover:text-[#ffb066]"
      >
        by kortexa.ai
      </a>
    </div>
  );
}
