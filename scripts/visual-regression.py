#!/usr/bin/env python3
"""
Visual regression para J&S Store.
Captura screenshots das principais rotas em 3 viewports (desktop, tablet, mobile).
Se existir baseline em scripts/visual-baseline/, compara pixel-a-pixel e falha se
diferença > threshold. Se não existir baseline, salva os atuais como baseline.

Uso:
  # 1ª execução (cria baseline):
  python3 scripts/visual-regression.py --update

  # execuções seguintes (compara):
  python3 scripts/visual-regression.py

  # forçar re-baseline de uma rota específica:
  python3 scripts/visual-regression.py --update --only home
"""
from __future__ import annotations
import argparse, asyncio, sys
from pathlib import Path
from playwright.async_api import async_playwright
from PIL import Image, ImageChops

BASE_URL = "http://localhost:8080"
ROOT = Path(__file__).parent
BASELINE = ROOT / "visual-baseline"
CURRENT = ROOT / "visual-current"
DIFF = ROOT / "visual-diff"

ROUTES = {
    "home": "/",
    "colecao": "/colecao",
    "produto": "/produto/vestido-longo-em-viscolinho-estampado-alca-larga-mr57tsv3",
    "checkout": "/checkout",
    "acompanhar": "/pedido/acompanhar",
}

VIEWPORTS = {
    "desktop": {"width": 1440, "height": 900},
    "tablet":  {"width": 820,  "height": 1180},
    "mobile":  {"width": 390,  "height": 844},
}

# Tolerância de pixels diferentes (0.5% da área)
DIFF_THRESHOLD_PCT = 0.5

# CSS injetado para desativar animações/carrossel para snapshots determinísticos
FREEZE_CSS = """
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
  }
  html { scroll-behavior: auto !important; }
"""

RESET = "\x1b[0m"; GREEN = "\x1b[32m"; RED = "\x1b[31m"; CYAN = "\x1b[36m"; YELLOW = "\x1b[33m"


def diff_images(a: Path, b: Path, out: Path) -> float:
    """Retorna % de pixels diferentes; salva imagem de diff se houver diferença."""
    ia = Image.open(a).convert("RGB")
    ib = Image.open(b).convert("RGB")
    if ia.size != ib.size:
        # normaliza para a mesma altura mínima
        h = min(ia.size[1], ib.size[1])
        ia = ia.crop((0, 0, ia.size[0], h))
        ib = ib.crop((0, 0, ib.size[0], h))
        if ia.size != ib.size:
            return 100.0
    diff = ImageChops.difference(ia, ib)
    bbox = diff.getbbox()
    if not bbox:
        return 0.0
    # conta pixels não-nulos
    px = list(diff.getdata())
    changed = sum(1 for r, g, b_ in px if (r + g + b_) > 12)  # tolerância leve
    total = len(px)
    pct = 100.0 * changed / total
    if pct > 0:
        out.parent.mkdir(parents=True, exist_ok=True)
        diff.save(out)
    return pct


async def capture(page, url: str, viewport: dict, out: Path):
    await page.set_viewport_size(viewport)
    await page.goto(url, wait_until="networkidle", timeout=30_000)
    await page.add_style_tag(content=FREEZE_CSS)
    await page.evaluate("window.scrollTo(0, 0)")
    await page.wait_for_timeout(400)
    out.parent.mkdir(parents=True, exist_ok=True)
    # screenshot da viewport (não full_page — por convenção do playbook)
    await page.screenshot(path=str(out))


async def main():
    p = argparse.ArgumentParser()
    p.add_argument("--update", action="store_true", help="atualiza baseline")
    p.add_argument("--only", default=None, help="rota específica (home|colecao|produto|checkout|acompanhar)")
    args = p.parse_args()

    routes = {args.only: ROUTES[args.only]} if args.only else ROUTES

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        results = []  # (route, viewport, status, detail)
        for route_name, path in routes.items():
            for vp_name, vp in VIEWPORTS.items():
                rel = f"{route_name}__{vp_name}.png"
                curr = CURRENT / rel
                base = BASELINE / rel
                print(f"{CYAN}▶{RESET} {route_name:12s} {vp_name:8s} ", end="", flush=True)
                try:
                    await capture(page, BASE_URL + path, vp, curr)
                except Exception as e:
                    print(f"{RED}CAPTURE FAIL{RESET} {e}")
                    results.append((route_name, vp_name, "capture-fail", str(e)))
                    continue

                if args.update or not base.exists():
                    base.parent.mkdir(parents=True, exist_ok=True)
                    Image.open(curr).save(base)
                    print(f"{YELLOW}BASELINE{RESET}")
                    results.append((route_name, vp_name, "baseline", ""))
                    continue

                pct = diff_images(base, curr, DIFF / rel)
                if pct <= DIFF_THRESHOLD_PCT:
                    print(f"{GREEN}OK{RESET}  diff={pct:.3f}%")
                    results.append((route_name, vp_name, "ok", f"{pct:.3f}%"))
                else:
                    print(f"{RED}DIFF{RESET} {pct:.3f}%  (limite {DIFF_THRESHOLD_PCT}%)  → {DIFF / rel}")
                    results.append((route_name, vp_name, "diff", f"{pct:.3f}%"))

        await browser.close()

    failed = [r for r in results if r[2] in ("diff", "capture-fail")]
    print(f"\n{YELLOW}Resumo:{RESET} {len(results)} capturas · {GREEN}{sum(1 for r in results if r[2]=='ok')} ok{RESET} · "
          f"{RED}{len(failed)} falha{RESET} · {sum(1 for r in results if r[2]=='baseline')} baseline")
    if failed:
        for r in failed: print(f"  - {r[0]}/{r[1]}: {r[2]} {r[3]}")
        sys.exit(1)
    print(f"{GREEN}✓ Sem regressões visuais.{RESET}")


asyncio.run(main())
