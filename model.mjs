// VPS sizing model, extracted from https://html5advent.com/tools/vps-size-calculator
export const CPU_STEPS = [1, 2, 4, 6, 8, 12, 16, 18, 24, 32];
export const STACKS = {
  static: { ram: 0.05, db: 0, disk: 1, cpu: 0.002, worker: 0, resp: 0.02, dynamic: false },
  wordpress: { ram: 0.25, db: 0.75, disk: 3, cpu: 0.08, worker: 0.06, resp: 0.25, dynamic: true },
  woocommerce: { ram: 0.4, db: 1.0, disk: 6, cpu: 0.15, worker: 0.08, resp: 0.35, dynamic: true },
  laravel: { ram: 0.3, db: 0.75, disk: 3, cpu: 0.06, worker: 0.06, resp: 0.2, dynamic: true },
  node: { ram: 0.3, db: 0.5, disk: 2, cpu: 0.02, worker: 0, resp: 0.1, dynamic: true },
  docker: { ram: 0.6, db: 0.75, disk: 8, cpu: 0.05, worker: 0.03, resp: 0.2, dynamic: true },
};
const up = (v, step) => Math.ceil(v / step) * step;
export function size({ stack = 'wordpress', apps = 1, visits = 30000, mediaGb = 5, peak = 4, cache = true, staging = false, mail = false, jobs = false }) {
  const s = STACKS[stack];
  apps = Math.min(50, Math.max(1, Math.round(apps)));
  const rps = visits * 2.5 / (30 * 86400) * peak;
  const cpuPerReq = s.cpu * (cache && s.dynamic && stack !== 'node' ? 0.35 : 1);
  const cores = rps * cpuPerReq * 2 + (jobs ? 0.5 : 0) + (mail ? 0.3 : 0) + (apps > 5 ? 1 : 0);
  let vcpu = Math.max(s.dynamic ? 2 : 1, Math.ceil(cores));
  vcpu = CPU_STEPS.find((c) => c >= vcpu) || vcpu;
  const os = 0.5, appRam = s.ram * apps;
  const db = s.db ? s.db * (1 + 0.25 * (apps - 1)) * (1 + 0.5 * Math.log10(Math.max(1, visits / 10000))) : 0;
  const conc = rps * s.resp;
  const workers = s.worker ? Math.max(2 * apps, Math.ceil(conc) + 2) * s.worker : 0;
  const extras = (cache ? 0.25 : 0) + (staging ? appRam * 0.5 + db * 0.3 : 0) + (mail ? 1 : 0) + (jobs ? 0.5 : 0);
  const sub = os + appRam + db + workers + extras;
  const ram = up(sub * 1.3, 0.5);
  const disk = up((10 + s.disk * apps * (staging ? 2 : 1) + mediaGb + (mail ? 10 : 0)) * 1.5, 5);
  const r2 = (v) => Math.round(v * 100) / 100;
  return { vcpu, ram, disk, rps: r2(rps),
    breakdown: { 'OS and base services': os, 'Application processes': r2(appRam), 'Database': r2(db), 'PHP or app workers': r2(workers), 'Cache, staging, mail, jobs': r2(extras), 'Headroom (30 %)': r2(sub * 0.3) } };
}
