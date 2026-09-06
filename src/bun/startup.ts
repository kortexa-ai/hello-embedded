export async function resolveMainViewUrl(
  packaged: boolean,
  devUrl = "http://127.0.0.1:5174",
  request: (url: string, init: RequestInit) => Promise<Response> = fetch,
  timeoutMs = 200,
): Promise<string> {
  const bundled = "views://mainview/index.html";
  if (packaged) return bundled;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  try {
    const probe = request(devUrl, { method: "HEAD", signal: controller.signal });
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => { controller.abort(); resolve(null); }, timeoutMs);
    });
    const response = await Promise.race([probe, timeout]);
    return response?.ok ? new URL("index.html", `${devUrl.replace(/\/$/, "")}/`).href : bundled;
  } catch { return bundled; }
  finally { clearTimeout(timer!); }
}
