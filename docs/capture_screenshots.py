"""Capture key UI screenshots for documentation."""
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
OUT = Path(__file__).resolve().parent / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)

EMAIL = "mukesh@ganeshtraders.com"
PASSWORD = "password123"


def shot(page, name):
    path = OUT / name
    page.screenshot(path=str(path), full_page=False)
    print("saved", path.name)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # Login page
        page.goto(f"{BASE}/login", wait_until="networkidle", timeout=60000)
        time.sleep(1)
        # Dismiss tour storage so it may show later after login; for login shot skip if any overlay
        shot(page, "01_login.png")

        # Fill login
        page.fill('input[type="email"], input[name="email"]', EMAIL)
        page.fill('input[type="password"], input[name="password"]', PASSWORD)
        page.click('button:has-text("Sign In")')
        page.wait_for_url("**/dashboard**", timeout=30000)
        time.sleep(2)

        # Skip tour if visible
        skip = page.locator('button:has-text("Skip"), button:has-text("Skip for now"), button:has-text("Skip tour")')
        if skip.count() > 0:
            try:
                skip.first.click(timeout=2000)
                time.sleep(0.5)
            except Exception:
                pass
        # Also close via X
        close_btn = page.locator('[aria-modal="true"] button[title="Skip tour"], [aria-modal="true"] button:has(svg)')
        if close_btn.count() > 0:
            try:
                page.keyboard.press("Escape")
                time.sleep(0.4)
            except Exception:
                pass

        page.evaluate("() => localStorage.setItem('dlms_tour_done', '1')")
        page.reload(wait_until="networkidle")
        time.sleep(1.5)
        shot(page, "03_dashboard.png")

        # Restart tour briefly for tour screenshot
        page.evaluate("() => localStorage.removeItem('dlms_tour_done')")
        help_btn = page.locator('button[title="Start website tour"]')
        if help_btn.count():
            help_btn.first.click()
            time.sleep(1)
            shot(page, "04_tour.png")
            page.keyboard.press("Escape")
            time.sleep(0.5)
        else:
            # open from settings later
            pass

        pages = [
            ("/customers", "05_customers.png"),
            ("/transactions", "06_transactions.png"),
            ("/invoices", "07_invoices.png"),
            ("/invoices/create", "08_create_invoice.png"),
            ("/ledger", "09_ledger.png"),
            ("/reports", "10_reports.png"),
            ("/analytics", "11_analytics.png"),
            ("/notifications", "12_notifications.png"),
            ("/profile", "13_profile.png"),
            ("/settings", "14_settings.png"),
            ("/signup", "02_signup.png"),
        ]

        for path, name in pages:
            if path == "/signup":
                # logout first for signup page
                page.goto(f"{BASE}/login", wait_until="networkidle")
                page.goto(f"{BASE}/signup", wait_until="networkidle")
                time.sleep(1)
                shot(page, name)
                continue
            page.goto(f"{BASE}{path}", wait_until="networkidle", timeout=60000)
            time.sleep(1.2)
            # dismiss tour overlays
            page.keyboard.press("Escape")
            time.sleep(0.3)
            shot(page, name)

        browser.close()
        print("Done capturing screenshots")


if __name__ == "__main__":
    main()
