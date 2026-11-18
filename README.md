# VPS sizing model

How many vCPU, how much RAM and how much disk does a WordPress, WooCommerce, Laravel, Node.js, Docker or static site need on a VPS? This repository is the sizing model used by the [HTML5 Advent VPS size calculator](https://html5advent.com/tools/vps-size-calculator), extracted into one dependency-free ES module so the assumptions can be read, tested and changed.

- `model.mjs`: the model, one `size()` function
- `index.html`: a standalone calculator built on it ([live page](https://ricco020.github.io/vps-size-calculator/))

## What the model says, in one table

Default extras: page cache on, no staging, no mail, no workers, 5 GB of uploads, one site. "Steady" means peak traffic is 4x the monthly average, "spiky" 12x.

| Stack | 10k visits/month | 100k visits/month | 1M visits/month, steady | 1M visits/month, spiky |
|---|---|---|---|---|
| Static | 1 vCPU, 1.5 GB, 25 GB | 1 vCPU, 1.5 GB, 25 GB | 1 vCPU, 1.5 GB, 25 GB | 1 vCPU, 1.5 GB, 25 GB |
| WordPress | 2 vCPU, 3 GB, 30 GB | 2 vCPU, 3 GB, 30 GB | 2 vCPU, 3.5 GB, 30 GB | 2 vCPU, 4 GB, 30 GB |
| WooCommerce | 2 vCPU, 3.5 GB, 35 GB | 2 vCPU, 4 GB, 35 GB | 2 vCPU, 5 GB, 35 GB | 2 vCPU, 5 GB, 35 GB |
| Laravel | 2 vCPU, 3 GB, 30 GB | 2 vCPU, 3.5 GB, 30 GB | 2 vCPU, 4 GB, 30 GB | 2 vCPU, 4 GB, 30 GB |
| Node.js | 2 vCPU, 2.5 GB, 30 GB | 2 vCPU, 2.5 GB, 30 GB | 2 vCPU, 3 GB, 30 GB | 2 vCPU, 3 GB, 30 GB |
| Docker Compose | 2 vCPU, 3 GB, 35 GB | 2 vCPU, 3.5 GB, 35 GB | 2 vCPU, 4 GB, 35 GB | 2 vCPU, 4 GB, 35 GB |

Multi-site cases:

| Case | Result |
|---|---|
| 5 WordPress sites, 100k visits, staging + mail | 2 vCPU, 9.5 GB, 85 GB |
| 10 WordPress sites, 300k visits, cron jobs | 2 vCPU, 12 GB, 70 GB |
| WooCommerce, 300k visits, no cache, spiky | 2 vCPU, 4 GB, 35 GB |
| 3 Docker Compose apps, 50k visits, staging | 2 vCPU, 7.5 GB, 95 GB |

Every cell is the output of `size()` in this repository, regenerate it with the snippet below.

## The finding: traffic is rarely what sizes a small VPS

One million visits a month is about 1 request per second on average and 3.9 at a steady peak (2.5 requests per visit, spread over 30 days, times a peak factor of 4). With a page cache, a WordPress request costs around 0.03 CPU-seconds, so the CPU term is about 0.2 of a core (doubled for safety) and the 2 vCPU floor never moves. What grows is memory: each extra site adds its PHP workers and its share of the database, and a staging copy or a mail server adds more than a tenfold rise in traffic does. If you are choosing between two plans, count sites, staging copies and services before you count visitors.

## How the model works

```
rps     = visits * 2.5 / (30 * 86400) * peakFactor
cores   = rps * cpuPerRequest * 2 + jobs 0.5 + mail 0.3 + (apps > 5 ? 1 : 0)
vcpu    = next step in 1, 2, 4, 6, 8, 12, 16, 18, 24, 32 (minimum 2 for dynamic stacks)
db      = dbBase * (1 + 0.25 * (apps - 1)) * (1 + 0.5 * log10(max(1, visits / 10000)))
workers = max(2 * apps, ceil(rps * responseTime) + 2) * workerRam
ram     = (0.5 OS + appRam * apps + db + workers + extras) * 1.3, rounded up to 0.5 GB
disk    = (10 + diskPerApp * apps * (staging ? 2 : 1) + media + (mail ? 10 : 0)) * 1.5, rounded up to 5 GB
```

A page cache divides the CPU cost of a PHP request by about three (factor 0.35). Per-stack constants live in `STACKS` at the top of `model.mjs`. They are rules of thumb from running these stacks, not benchmarks of your code: if you have real numbers (`ps`, `htop`, your slow log), replace them.

## Use it

```js
import { size } from './model.mjs';
console.log(size({ stack: 'laravel', apps: 2, visits: 200000, staging: true }));
// { vcpu, ram, disk, rps, breakdown: {...} }
```

```sh
node -e "import('./model.mjs').then(m => console.log(m.size({ stack: 'wordpress', visits: 1e6 })))"
```

## From size to price

The [full calculator](https://html5advent.com/tools/vps-size-calculator) maps the result to a current plan with its monthly price, and [How much does a VPS cost](https://html5advent.com/guides/how-much-does-a-vps-cost) compares what each size really costs per month. For a WordPress-specific walk-through see [WordPress on a VPS](https://html5advent.com/guides/wordpress-vps).

## Licence

MIT
