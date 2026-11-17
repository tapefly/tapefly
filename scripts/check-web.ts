export {};

const base = (process.env.TAPEFLY_BASE ?? "https://tapefly.xyz").replace(/\/$/, "");
const routes = [
  ["/", "拼一只机器果蝇"],
  ["/workshop", "用零件搭一只机器果蝇"],
  ["/workshop/gallery", "大家的设计"],
  ["/docs/workshop", "Workshop API"],
  ["/api/v1/health", "\"ok\":true"],
] as const;

let failed = false;
for (const [route, marker] of routes) {
  try {
    const response = await fetch(base + route, { redirect: "follow" });
    const text = await response.text();
    const ok = response.status === 200 && text.includes(marker);
    console.log(`${ok ? "ok" : "fail"} ${response.status} ${route}`);
    failed ||= !ok;
  } catch (error) {
    console.error(`fail ${route}: ${String(error)}`);
    failed = true;
  }
}
if (failed) process.exit(1);
