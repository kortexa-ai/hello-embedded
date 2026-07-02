// Perf probe page (views://mainview/perf.html).
//
// Purpose-built for measuring the linux-embedded compositor + transport on a
// kiosk (or a headless Pi with a phantom display — see the electrobun repo's
// linux-wpe notes). Works on every Electrobun target, so the same numbers can
// be compared across macOS / desktop-Linux / WPE.
//
// What it measures, once per second:
//   fps            — rAF callbacks in the last second. The page mutates
//                    layout every frame, forcing WebKit to raster + export
//                    continuously, so this reveals compositor frame pacing.
//   rpcRoundTripMs — webview→bun→webview RPC request round trip over the
//                    encrypted socket transport.
//   ticksSeen      — count of bun→webview pushes received (bun sends one per
//                    second; lag here means the push path is degraded).
//
// Run with ELECTROBUN_START_PAGE=perf to boot straight into this page; stats
// are also mirrored to the bun process log via the "perf-stats" message.

import { Electroview } from "electrobun/view";

let ticksSeen = 0;

const rpc = Electroview.defineRPC<any>({
	maxRequestTime: 5000,
	handlers: {
		requests: {},
		messages: {
			tick: () => {
				ticksSeen++;
			},
		},
	},
});
const electrobun = new Electroview({ rpc });

let frames = 0;
const counter = document.getElementById("counter")!;
const bar = document.getElementById("bar")! as HTMLElement;
const stats = document.getElementById("stats")!;

function loop() {
	frames++;
	counter.textContent = "frame " + frames;
	bar.style.width = 120 + (frames % 600) + "px";
	requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

setInterval(async () => {
	const fps = frames;
	frames = 0;
	let rpcRoundTripMs = -1;
	try {
		const t0 = performance.now();
		await (electrobun.rpc as any).request.ping({ n: fps });
		rpcRoundTripMs = Math.round((performance.now() - t0) * 100) / 100;
	} catch {
		// leave -1: round trip failed
	}
	stats.textContent = `fps=${fps} rpcRoundTripMs=${rpcRoundTripMs} ticksSeen=${ticksSeen}`;
	(electrobun.rpc as any).send["perf-stats"]({ fps, rpcRoundTripMs, ticksSeen });
}, 1000);
