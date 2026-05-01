import bunnyUrl from "./bunny.png";

export function App() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-r from-[#cc3300] to-[#ff8a00] text-[#fff5e6] font-sans select-none">
      <div className="flex flex-col items-center gap-4">
        <img
          src={bunnyUrl}
          alt="hello-embedded"
          className="h-[clamp(64px,14vmin,128px)] w-auto drop-shadow-lg"
        />
        <h1 className="text-[clamp(48px,12vmin,120px)] font-extrabold leading-none">
          Hello, Electrobun
          <span className="text-[#ffd24d]">.</span>
        </h1>
        {/* Navigation smoke test (linux-wpe §16). The About button uses
            __electrobunSendToHost to ask Bun to open a BrowserWindow —
            renderers can't open windows themselves. */}
        <div className="mt-6 flex gap-5">
          <button
            type="button"
            onClick={() => {
              window.location.href = "./page2.html";
            }}
            className="rounded-md border border-[#fff5e6]/40 px-[4rem] py-[1.6rem] text-[1.8rem] hover:bg-[#fff5e6]/10"
          >
            json-render demo
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.href = "https://www.google.com";
            }}
            className="rounded-md border border-[#fff5e6]/40 px-[4rem] py-[1.6rem] text-[1.8rem] hover:bg-[#fff5e6]/10"
          >
            google.com
          </button>
          <button
            type="button"
            onClick={() => {
              (
                window as unknown as {
                  __electrobunSendToHost?: (msg: unknown) => void;
                }
              ).__electrobunSendToHost?.({ action: "show-about" });
            }}
            className="rounded-md border border-[#fff5e6]/40 px-[4rem] py-[1.6rem] text-[1.8rem] hover:bg-[#fff5e6]/10"
          >
            about
          </button>
        </div>
      </div>
    </div>
  );
}
