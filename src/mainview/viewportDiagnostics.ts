export function logViewport(label: string) {
  const report = () => {
    console.log(
      `[viewport:${label}] ${window.innerWidth}x${window.innerHeight} dpr=${window.devicePixelRatio}`,
    );
  };

  window.addEventListener("resize", report);
  requestAnimationFrame(report);
}
