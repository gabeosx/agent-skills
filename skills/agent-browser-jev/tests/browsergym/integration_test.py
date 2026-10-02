"""No-model checks for the independent BrowserGym integration rewards."""

import threading
import tempfile
import unittest
from http.server import ThreadingHTTPServer

from playwright.sync_api import sync_playwright

from integration_tasks import IntegrationHandler, IntegrationTask
from episode import attach_task_tab, browser_command, chrome_endpoint


class IntegrationTasksTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), IntegrationHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.server.server_address[1]}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=5)

    def test_goals_have_independent_zero_and_one_rewards(self):
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            try:
                for seed in (11, 12, 13, 14):
                    for case in ("contact-copy", "preferences", "review-approval"):
                        with self.subTest(seed=seed, case=case):
                            page = browser.new_page()
                            task = IntegrationTask(seed, case, self.base_url)
                            goal, _ = task.setup(page)
                            self.assertTrue(goal)
                            self.assertEqual(task.validate(page, [])[0], 0)
                            if case == "contact-copy":
                                page.get_by_role("link", name="Open intake form").click()
                                page.get_by_role("textbox", name="Tracking code").fill(task.person[1])
                                page.get_by_role("button", name="Submit intake").click()
                            elif case == "preferences":
                                page.get_by_role("checkbox", name="Email alerts").check()
                                page.get_by_label("Digest frequency").select_option(task.frequency)
                                page.get_by_role("button", name="Save preferences").click()
                            else:
                                owner = "Elena" if task.request_id == "Q-204" else "Marco"
                                page.get_by_role("row", name=f"{task.request_id} {owner} View request").get_by_role("link").click()
                                page.get_by_role("button", name="Approve request").click()
                                page.get_by_role("button", name="Confirm approval").click()
                            self.assertEqual(task.validate(page, [])[0], 1)
                            page.close()
            finally:
                browser.close()

    def test_cdp_browser_actions_preserve_the_task_page(self):
        with tempfile.TemporaryDirectory() as chrome_dir, sync_playwright() as playwright:
            chrome, port = chrome_endpoint(playwright.chromium.executable_path, chrome_dir)
            browser = playwright.chromium.connect_over_cdp(f"http://127.0.0.1:{port}")
            session = "jev-bgym-integration-test"
            try:
                task = IntegrationTask(11, "preferences", self.base_url)
                page = browser.new_context().new_page()
                task.setup(page)
                attach_task_tab(session, port, page.url)
                refs = browser_command(session, port, "snapshot")["refs"]
                by_role = {value["role"]: key for key, value in refs.items()}
                browser_command(session, port, "check", "@" + by_role["checkbox"])
                browser_command(session, port, "select", "@" + by_role["combobox"], "Weekly")
                browser_command(session, port, "click", "@" + by_role["button"])
                self.assertEqual(task.validate(page, [])[0], 1)
            finally:
                browser.close()
                chrome.terminate()
                chrome.wait(timeout=5)


if __name__ == "__main__":
    unittest.main()
