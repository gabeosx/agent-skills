"""Small, self-contained BrowserGym core tasks with independently checked outcomes.

These are original integration tasks, not tasks from a public benchmark suite.
The site and evaluator run only inside the disposable BrowserGym container.
"""

from html import escape
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

from browsergym.core.task import AbstractBrowserTask
from playwright.sync_api import Error as PlaywrightError


CASES = ("contact-copy", "preferences", "review-approval")
PEOPLE = (("Naomi Chen", "NC-482"), ("Amara Bell", "AB-719"),
          ("Mateo Ruiz", "MR-563"), ("Iris Park", "IP-846"))


def document(title, body):
    return ("<!doctype html><html lang='en'><meta charset='utf-8'>"
            "<title>Northstar Office</title><style>body{font:17px system-ui;"
            "max-width:860px;margin:40px auto;line-height:1.5}nav{margin-bottom:32px}"
            "table{border-collapse:collapse}td,th{padding:10px 18px;border:1px solid #bbb}"
            "a,button{font:inherit}label{display:block;margin:16px 0}</style>"
            f"<nav><a href='/integration/home'>Northstar Office</a></nav><h1>{escape(title)}</h1>{body}</html>")


class IntegrationHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlsplit(self.path)
        path = parsed.path.strip("/").split("/")
        params = parse_qs(parsed.query)
        if path == ["integration", "home"]:
            body = ("<ul><li><a href='/integration/contact-copy/0'>Contacts</a></li>"
                    "<li><a href='/integration/preferences/0'>Preferences</a></li>"
                    "<li><a href='/integration/review-approval/0'>Reviews</a></li></ul>")
            html = document("Dashboard", body)
        elif len(path) == 3 and path[:2] == ["integration", "contact-copy"]:
            html = document("Contacts", "<table><tr><th>Name</th><th>Tracking code</th></tr>"
                + "".join(f"<tr><td>{name}</td><td>{code}</td></tr>" for name, code in PEOPLE)
                + "</table><p><a href='intake'>Open intake form</a></p>")
        elif len(path) == 4 and path[:2] == ["integration", "contact-copy"] and path[3] == "intake":
            html = document("Intake form", "<form action='submitted' method='get'>"
                "<label>Tracking code <input name='code'></label><button>Submit intake</button></form>")
        elif len(path) == 4 and path[:2] == ["integration", "contact-copy"] and path[3] == "submitted":
            html = document("Intake recorded", "<p>The submitted tracking code was recorded.</p>")
        elif len(path) == 3 and path[:2] == ["integration", "preferences"]:
            html = document("Preferences", "<form action='saved' method='get'>"
                "<label><input type='checkbox' name='alerts' value='on'> Email alerts</label>"
                "<label>Digest frequency <select name='frequency'><option>Daily</option>"
                "<option>Weekly</option><option>Monthly</option></select></label>"
                "<button>Save preferences</button></form>")
        elif len(path) == 4 and path[:2] == ["integration", "preferences"] and path[3] == "saved":
            html = document("Preferences saved", "<p>Your preferences were saved.</p>")
        elif len(path) == 3 and path[:2] == ["integration", "review-approval"]:
            html = document("Reviews", "<table><tr><th>Request</th><th>Owner</th><th>Open</th></tr>"
                "<tr><td>Q-204</td><td>Elena</td><td><a href='Q-204/'>View request</a></td></tr>"
                "<tr><td>Q-205</td><td>Marco</td><td><a href='Q-205/'>View request</a></td></tr></table>")
        elif len(path) == 4 and path[:2] == ["integration", "review-approval"]:
            request_id = escape(path[3])
            html = document(f"Expense request {request_id}",
                f"<p>Request {request_id} is awaiting review.</p>"
                "<form action='confirm' method='get'><button>Approve request</button></form>")
        elif len(path) == 5 and path[:2] == ["integration", "review-approval"] and path[4] == "confirm":
            html = document("Confirm approval", f"<p>Approve request {escape(path[3])}?</p>"
                "<form action='approved' method='get'><button>Confirm approval</button></form>")
        elif len(path) == 5 and path[:2] == ["integration", "review-approval"] and path[4] == "approved":
            html = document("Approval recorded", f"<p>Request {escape(path[3])} was approved.</p>")
        else:
            self.send_error(404)
            return
        encoded = html.encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def log_message(self, _format, *_args):
        pass


class IntegrationTask(AbstractBrowserTask):
    def __init__(self, seed, case, base_url):
        super().__init__(seed)
        if case not in CASES:
            raise ValueError("Unknown integration case")
        self.case = case
        self.base_url = base_url
        self.person = PEOPLE[seed % len(PEOPLE)]
        self.frequency = "Weekly" if seed % 2 else "Monthly"
        self.request_id = "Q-204" if seed % 2 else "Q-205"

    @classmethod
    def get_task_id(cls):
        return "integration"

    def setup(self, page):
        page.goto(f"{self.base_url}/integration/{self.case}/{self.random.randint(0, 100000)}/")
        goals = {
            "contact-copy": f"In Contacts, copy the tracking code for {self.person[0]} into the intake form and submit it.",
            "preferences": f"Turn on Email alerts, set Digest frequency to {self.frequency}, and save the preferences.",
            "review-approval": f"In Reviews, approve expense request {self.request_id} and confirm the approval.",
        }
        return goals[self.case], {}

    def validate(self, page, _chat_messages):
        # A separate CDP client may navigate while Playwright's sync transport is
        # idle; a browser read pumps those events before evaluating the reward.
        page.wait_for_load_state("domcontentloaded")
        for attempt in range(5):
            try:
                current_url = page.evaluate("location.href")
                break
            except PlaywrightError as error:
                if "Execution context was destroyed" not in str(error) or attempt == 4:
                    raise
                page.wait_for_timeout(100)
        parsed = urlsplit(current_url)
        parts = parsed.path.strip("/").split("/")
        params = parse_qs(parsed.query)
        passed = False
        if self.case == "contact-copy":
            passed = len(parts) == 4 and parts[:2] == ["integration", self.case] and \
                parts[3] == "submitted" and params.get("code") == [self.person[1]]
        elif self.case == "preferences":
            passed = len(parts) == 4 and parts[:2] == ["integration", self.case] and \
                parts[3] == "saved" and params.get("alerts") == ["on"] and \
                params.get("frequency") == [self.frequency]
        elif self.case == "review-approval":
            passed = len(parts) == 5 and parts[:2] == ["integration", self.case] and \
                parts[3:] == [self.request_id, "approved"]
        return float(passed), passed, "", {}
