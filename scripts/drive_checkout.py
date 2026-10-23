"""用 CDP 真机走一遍「选券 → 去结算 → 支付 → 成功」以及「金额跌破门槛自动摘券」。

只依赖标准库 + websocket-client，输出截图到 public/screenshots/，并把关键界面文本打印出来。
"""

from __future__ import annotations

import base64
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request

import websocket

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
PORT = 9333
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, "public", "screenshots")
BASE = "http://127.0.0.1:4188"


class Page:
    def __init__(self) -> None:
        self.proc = None
        self.ws = None
        self.seq = 0

    def start(self) -> None:
        profile = tempfile.mkdtemp(prefix="edge-cdp-")
        self.proc = subprocess.Popen(
            [
                EDGE,
                "--headless=new",
                "--disable-gpu",
                "--no-first-run",
                "--no-default-browser-check",
                "--remote-allow-origins=*",
                f"--remote-debugging-port={PORT}",
                f"--user-data-dir={profile}",
                "--hide-scrollbars",
                "--window-size=1440,1120",
                "about:blank",
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        url = f"http://127.0.0.1:{PORT}/json"
        for _ in range(80):
            try:
                with urllib.request.urlopen(url, timeout=1) as resp:
                    targets = json.load(resp)
                pages = [t for t in targets if t.get("type") == "page"]
                if pages:
                    break
            except Exception:
                pass
            time.sleep(0.25)
        else:
            raise RuntimeError("Edge 调试端口没起来")

        self.ws = websocket.create_connection(
            pages[0]["webSocketDebuggerUrl"], suppress_origin=True, timeout=40
        )
        self.call("Page.enable")
        self.call("Runtime.enable")
        # 每次新文档都挂一遍错误采集，最后统一读 window.__errs
        self.call(
            "Page.addScriptToEvaluateOnNewDocument",
            source="""
            window.__errs = [];
            window.addEventListener('error', e => window.__errs.push('error: ' + (e.message || '')));
            window.addEventListener('unhandledrejection', e =>
              window.__errs.push('reject: ' + ((e.reason && e.reason.message) || e.reason)));
            const rawError = console.error;
            console.error = (...args) => { window.__errs.push('console: ' + args.join(' ')); rawError(...args); };
            """,
        )
        self.viewport(1440, 1120)

    def viewport(self, width: int, height: int, scale: int = 1) -> None:
        self.call(
            "Emulation.setDeviceMetricsOverride",
            width=width,
            height=height,
            deviceScaleFactor=scale,
            mobile=width < 600,
        )

    def call(self, method: str, **params):
        self.seq += 1
        mid = self.seq
        self.ws.send(json.dumps({"id": mid, "method": method, "params": params}))
        while True:
            message = json.loads(self.ws.recv())
            if message.get("id") == mid:
                if "error" in message:
                    raise RuntimeError(f"{method} 失败: {message['error']}")
                return message.get("result", {})

    def goto(self, path: str, wait: float = 2.4) -> None:
        self.call("Page.navigate", url=BASE + path)
        time.sleep(wait)

    def js(self, expression: str):
        result = self.call(
            "Runtime.evaluate",
            expression=expression,
            returnByValue=True,
            awaitPromise=False,
        )
        return result.get("result", {}).get("value")

    def click_text(self, text: str) -> bool:
        return bool(
            self.js(
                "(() => { const b = [...document.querySelectorAll('button')]"
                f".find(x => x.textContent.replace(/\\s+/g,' ').includes({text!r}));"
                " if (!b || b.disabled) return false; b.click(); return true; })()"
            )
        )

    def shot(self, name: str) -> str:
        data = self.call("Page.captureScreenshot", format="png")["data"]
        path = os.path.join(DOCS, name)
        with open(path, "wb") as handle:
            handle.write(base64.b64decode(data))
        print(f"  截图 → public/screenshots/{name}")
        return path

    def close(self) -> None:
        try:
            self.ws.close()
        except Exception:
            pass
        if self.proc:
            self.proc.terminate()
            try:
                self.proc.wait(timeout=6)
            except Exception:
                self.proc.kill()


def aside_text(page: Page) -> str:
    return (page.js("document.querySelector('aside')?.innerText || ''") or "").replace(
        "\n", " | "
    )


def main() -> int:
    page = Page()
    page.start()
    try:
        print("[1] 桌面端：进入味觉模式")
        page.goto("/?mode=taste")
        print("  侧栏金额：", aside_text(page)[:150])
        page.shot("select.png")

        print("[2] 选用「满 30 减 5」")
        print("  点击成功：", page.click_text("满 30 减 5"))
        time.sleep(1.0)
        print("  侧栏金额：", aside_text(page)[:200])
        page.shot("coupon.png")

        print("[3] 打开结算弹窗")
        print("  点击成功：", page.click_text("去结算"))
        time.sleep(0.9)
        print(
            "  弹窗文本：",
            (page.js("document.querySelector('[role=dialog]')?.innerText || ''") or "").replace(
                "\n", " | "
            )[:260],
        )
        page.shot("checkout.png")

        print("[4] 确认支付")
        print("  点击成功：", page.click_text("确认支付"))
        time.sleep(0.45)
        page.shot("paying.png")
        time.sleep(1.9)
        print(
            "  成功页文本：",
            (page.js("document.querySelector('[role=dialog]')?.innerText || ''") or "").replace(
                "\n", " | "
            )[:200],
        )
        page.shot("success.png")

        print("[5] 返回首页后状态是否清空")
        print("  点击成功：", page.click_text("返回首页"))
        time.sleep(1.2)
        print("  当前 URL：", page.js("location.search || '(空)'"))
        print("  首页模式卡数量：", page.js("document.querySelectorAll('[data-mode-id]').length"))
        page.shot("success-home.png")

        print("[6] 回到选餐页，验证金额跌破门槛自动摘券")
        page.goto("/?mode=taste")
        page.click_text("满 30 减 5")
        time.sleep(0.8)
        print("  选券后：", aside_text(page)[:160])
        removed = page.js(
            "(() => { const labels = ['删掉 薯条','删掉 可口可乐']; const done = [];"
            " labels.forEach(l => { const b = document.querySelector(`[aria-label=\"${l}\"]`);"
            " if (b) { b.click(); done.push(l); } }); return done; })()"
        )
        print("  已删除：", removed)
        time.sleep(1.0)
        print("  删除后侧栏：", aside_text(page)[:200])
        print("  提示条：", page.js("document.body.innerText.match(/还差[^\\n]*/)?.[0] || '(无)'"))
        page.shot("invalidate.png")

        print("[7] 热量预警：味觉模式再加两份薯条")
        page.goto("/?mode=taste")
        page.click_text("薯条")
        time.sleep(0.45)
        page.click_text("薯条")
        time.sleep(1.0)
        print("  预警文案：", page.js(
            "document.body.innerText.match(/当前热量偏高[^\\n]*/)?.[0] || '(无)'"
        ))
        print("  热量明细：", page.js(
            "document.body.innerText.match(/\\d+ \\/ \\d+ kcal[^\\n]*/)?.[0] || '(无)'"
        ))
        page.shot("warning.png")

        print("[8] 移动端 390×844")
        page.viewport(390, 844, 2)
        page.goto("/?mode=value")
        page.shot("mobile.png")
        print("  底部条：", (page.js(
            "document.querySelector('.fixed.inset-x-0.bottom-0')?.innerText || ''"
        ) or "").replace("\n", " | ")[:120])
        page.click_text("去结算")
        time.sleep(0.9)
        page.shot("mobile-checkout.png")

        errors = page.js("window.__errs || []") or []
        print("\n控制台报错：", errors if errors else "无")
        print("完成。")
        return 0 if not errors else 1
    finally:
        page.close()


if __name__ == "__main__":
    sys.exit(main())
