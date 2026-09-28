"""Run real BrowserGym MiniWoB tasks in the same Chromium page as agent-browser.

Only this Docker image needs Python, Playwright and MiniWoB. BrowserGym owns task
generation and reward; the helper sees only the generated goal and page.
"""

import argparse
import json
import os
import re
import shutil
import socket
import subprocess
import tempfile
import threading
import time
import urllib.request
from contextlib import contextmanager, nullcontext
from functools import partial
from http.client import RemoteDisconnected
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from importlib.metadata import version as package_version
from pathlib import Path

from playwright.sync_api import sync_playwright
from browsergym.miniwob import ALL_MINIWOB_TASKS
from browsergym.webarena_verified.task import WebArenaVerifiedTask
from webarena_verified.types.tracing import NetworkTrace
from integration_tasks import CASES as INTEGRATION_CASES, IntegrationHandler, IntegrationTask


TASKS = {task.get_task_id().removeprefix("miniwob."): task for task in ALL_MINIWOB_TASKS}
ALLOWED = {"click-button", "choose-list", "click-checkboxes", "enter-text", "use-autocomplete",
           "click-tab", "click-menu", "form-sequence", "click-button-sequence",
           "click-checkboxes-large", "click-collapsible", "click-dialog", "click-link",
           "click-menu-2", "click-option", "click-scroll-list", "click-tab-2",
           "navigate-tree", "read-table", "search-engine", "sign-agreement"}
WEBARENA_VERIFIED_ALLOWED = {"399", "404", "595", "650", "603"}
MINIWOB_ROOT = Path("/opt/miniwob/miniwob/html")
BRIDGE = Path(__file__).with_name("run-helper.mjs")


def command(args, *, timeout=30, input_text=None):
    return subprocess.run(args, input=input_text, text=True, capture_output=True,
                          timeout=timeout, check=True)


def browser_command(session, port, *args):
    response = json.loads(command(["agent-browser", "--session", session,
                                   "--cdp", str(port), "--json", *args]).stdout)
    if not response.get("success"):
        raise RuntimeError(f"agent-browser {args[0]} failed: {response.get('error')}")
    return response.get("data")


def extract_url(value):
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        return value.get("url") or value.get("value")
    return None


def attach_task_tab(session, port, expected_url):
    browser_command(session, port, "snapshot")
    if extract_url(browser_command(session, port, "get", "url")) == expected_url:
        return
    tabs = browser_command(session, port, "tab", "list")
    if isinstance(tabs, dict):
        tabs = tabs.get("tabs", tabs.get("pages", []))
    if not isinstance(tabs, list):
        raise RuntimeError("Could not enumerate CDP tabs")
    for index in range(len(tabs) + 1):
        try:
            browser_command(session, port, "tab", str(index))
            if extract_url(browser_command(session, port, "get", "url")) == expected_url:
                return
        except (RuntimeError, subprocess.CalledProcessError):
            pass
    raise RuntimeError("agent-browser did not attach to BrowserGym's task page")


def chrome_endpoint(executable, directory, headed=False):
    options = [executable, "--no-sandbox",
        "--disable-dev-shm-usage", "--no-first-run", "--no-default-browser-check",
        "--remote-debugging-address=127.0.0.1", "--remote-debugging-port=0",
        f"--user-data-dir={directory}"]
    options.append("--window-size=1280,800" if headed else "--headless=new")
    process = subprocess.Popen([*options, "about:blank"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    endpoint_file = Path(directory) / "DevToolsActivePort"
    for _ in range(200):
        if endpoint_file.exists():
            return process, int(endpoint_file.read_text().splitlines()[0])
        if process.poll() is not None:
            raise RuntimeError("Chromium exited before opening CDP")
        time.sleep(0.1)
    process.terminate()
    raise RuntimeError("Chromium did not open CDP in 20 seconds")


def wait_for_port(port, process, label):
    for _ in range(100):
        if process.poll() is not None:
            raise RuntimeError(f"{label} exited before becoming ready")
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.1):
                return
        except OSError:
            time.sleep(0.1)
    raise RuntimeError(f"{label} did not become ready in 10 seconds")


def require_vnc_auth():
    def read_exact(connection, count):
        data = b""
        while len(data) < count:
            part = connection.recv(count - len(data))
            if not part:
                raise RuntimeError("VNC closed during authentication handshake")
            data += part
        return data

    with socket.create_connection(("127.0.0.1", 5900), timeout=2) as connection:
        connection.settimeout(2)
        banner = read_exact(connection, 12)
        if not banner.startswith(b"RFB 003."):
            raise RuntimeError("VNC did not send an RFB handshake")
        connection.sendall(banner)
        count = read_exact(connection, 1)[0]
        methods = read_exact(connection, count) if count else b""
        if b"\x02" not in methods or b"\x01" in methods:
            raise RuntimeError("VNC must require password authentication")


@contextmanager
def viewer_session():
    password = os.environ.get("JEV_GYM_VIEWER_PASSWORD", "")
    if not re.fullmatch(r"[A-Za-z0-9_-]{8}", password):
        raise ValueError("Headed mode requires an eight-character ephemeral viewer password")
    processes = []
    with tempfile.TemporaryDirectory(prefix="jev-bgym-viewer-") as directory:
        password_file = Path(directory) / "password"
        password_file.write_text(password + "\n")
        password_file.chmod(0o600)
        try:
            display = subprocess.Popen(["Xvfb", ":99", "-screen", "0", "1280x800x24",
                "-nolisten", "tcp", "-noreset"], stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL)
            processes.append(display)
            for _ in range(100):
                if Path("/tmp/.X11-unix/X99").exists():
                    break
                if display.poll() is not None:
                    raise RuntimeError("Xvfb exited before opening the display")
                time.sleep(0.1)
            else:
                raise RuntimeError("Xvfb did not open the display in 10 seconds")
            os.environ["DISPLAY"] = ":99"
            vnc = subprocess.Popen(["x11vnc", "-display", ":99", "-localhost",
                "-rfbport", "5900", "-forever", "-shared", "-passwdfile",
                str(password_file)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            processes.append(vnc)
            wait_for_port(5900, vnc, "x11vnc")
            require_vnc_auth()
            web = subprocess.Popen(["websockify", "--web=/usr/share/novnc",
                "0.0.0.0:6080", "127.0.0.1:5900"], stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL)
            processes.append(web)
            wait_for_port(6080, web, "noVNC")
            yield
        finally:
            for process in reversed(processes):
                process.terminate()
            for process in reversed(processes):
                try:
                    process.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=3)


def prepare_helper(source, destination):
    shutil.copytree(source, destination,
                    ignore=shutil.ignore_patterns("node_modules", ".git", "*.runs", "evidence"))
    subprocess.run(["npm", "ci", "--omit=dev", "--no-audit", "--no-fund"],
                   cwd=destination, text=True, capture_output=True, timeout=180, check=True)


def reset_webarena_verified(reset_url):
    for _ in range(180):
        try:
            with urllib.request.urlopen(f"{reset_url}/status", timeout=5) as response:
                if response.status == 200 and json.load(response).get("success") is True:
                    break
        except Exception:
            pass
        time.sleep(1)
    else:
        raise RuntimeError("WebArena-Verified environment control did not become ready")
    request = urllib.request.Request(f"{reset_url}/init", method="POST")
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            if response.status // 100 != 2:
                raise RuntimeError(f"WebArena-Verified reset returned HTTP {response.status}")
    except RemoteDisconnected:
        # env-ctrl restarts itself during init and can close an accepted request.
        pass
    for _ in range(180):
        try:
            with urllib.request.urlopen(f"{reset_url}/status", timeout=5) as response:
                if response.status == 200 and json.load(response).get("success") is True:
                    return
        except Exception:
            pass
        time.sleep(1)
    raise RuntimeError("WebArena-Verified environment did not become ready after reset")


def webarena_response(task, completed):
    response_eval = next((entry for entry in task.config["eval"]
                          if entry["evaluator"] == "AgentResponseEvaluator"), None)
    if not response_eval:
        raise RuntimeError("WebArena-Verified task has no agent response contract")
    task_type = response_eval["expected"]["task_type"].upper()
    if task_type == "RETRIEVE":
        raise RuntimeError("Retrieval tasks are outside this browser-control adapter")
    return json.dumps({"task_type": task_type,
                       "status": "SUCCESS" if completed else "UNKNOWN_ERROR",
                       "retrieved_data": None,
                       "error_details": None if completed else "Browser helper did not establish completion"})


def response_to_har(response):
    """Capture the HAR subset WebArena-Verified needs while request data is live."""
    request = response.request
    request_headers = request.headers
    response_headers = response.headers
    post_data = request.post_data
    request_content_type = request_headers.get("content-type", "")
    if post_data is not None and not request_content_type:
        request_content_type = ("multipart/form-data" if post_data.startswith("--")
                                else "application/x-www-form-urlencoded")
    content_type = response_headers.get("content-type", "")
    return {
        "request": {
            "method": request.method,
            "url": request.url,
            "headers": [{"name": name, "value": value}
                        for name, value in request_headers.items()],
            **({"postData": {
                "mimeType": request_content_type,
                "text": post_data,
            }} if post_data is not None else {}),
        },
        "response": {
            "status": response.status,
            "headers": [{"name": name, "value": value}
                        for name, value in response_headers.items()],
            "cookies": [],
            "redirectURL": response_headers.get("location", ""),
            "content": {
                "mimeType": content_type,
                # The selected mutation tasks assert the request and status, not
                # the response body. Reading a body from a response callback can
                # deadlock Playwright, so keep this core trace deliberately small.
                "text": "",
            },
        },
    }


def run_case(task_name, seed, arm, helper_dir, *, suite="miniwob", base_url=None,
             smoke=False, positive_control=False, headed=False, watch_delay_ms=0):
    session = f"jev-bgym-{os.getpid()}-{arm}-{task_name}-{seed}"
    trial = {"id": task_name, "seed": seed, "variant": suite, "round": 1,
             "arm": arm, "benchmarkId": f"browsergym/{suite}.{task_name}"}
    started = time.monotonic()
    with tempfile.TemporaryDirectory(prefix="jev-bgym-chrome-") as chrome_dir:
        with sync_playwright() as playwright:
            chrome, port = chrome_endpoint(playwright.chromium.executable_path, chrome_dir, headed)
            browser = None
            task = None
            try:
                browser = playwright.chromium.connect_over_cdp(f"http://127.0.0.1:{port}")
                task = (TASKS[task_name](seed=seed, episode_max_time=180000)
                        if suite == "miniwob" else
                        WebArenaVerifiedTask(seed=seed, task_id=int(task_name))
                        if suite == "webarena-verified" else
                        IntegrationTask(seed, task_name, base_url))
                context = browser.new_context(viewport=task.viewport)
                network_probe = []
                captured_trace = []
                page = context.new_page()
                goal, initial_info = task.setup(page)
                if suite == "webarena-verified":
                    # BrowserGym appends an answer-schema instruction for agents that expose
                    # send_msg_to_user. Jev is a browser-control helper, so it receives only
                    # the benchmark's legitimate task intent. The adapter supplies protocol
                    # scaffolding after the run; hidden expected values never enter model input.
                    goal = task.config["intent"]
                    trial["benchmarkId"] = (f"browsergym/webarena_verified."
                        f"{task.config['intent_template_id']}.{task.config['task_id']}."
                        f"{task.config['revision']}")
                    trial["taskType"] = next(entry["expected"]["task_type"] for entry in task.config["eval"]
                        if entry["evaluator"] == "AgentResponseEvaluator")
                    def capture_response(response):
                        try:
                            # Playwright releases navigation request payloads after
                            # redirects. Materialize the form body at response time.
                            captured_trace.append(response_to_har(response))
                        except Exception:
                            pass
                    context.on("response", capture_response)
                    if smoke:
                        context.on("request", lambda request: network_probe.append({
                            "method": request.method, "url": request.url,
                            "postData": request.post_data}) if request.method != "GET" else None)
                trial["goal"] = goal
                trial["initialInfo"] = initial_info
                attach_task_tab(session, port, page.url)
                if watch_delay_ms:
                    time.sleep(watch_delay_ms / 1000)
                if smoke:
                    ordinary_session = json.loads(command(["agent-browser", "--session", session,
                        "--json", "get", "url"]).stdout)
                    trial["helperSessionPage"] = extract_url(ordinary_session.get("data")) == page.url
                    trial["initialSnapshot"] = browser_command(session, port, "snapshot")
                    browser_command(session, port, "eval", "window.__jevGymProbe = 'shared-page'")
                    trial["sharedPage"] = page.evaluate("window.__jevGymProbe") == "shared-page"
                    if suite == "miniwob":
                        target = re.search(r'"([^\"]+)"', goal)
                        if not target:
                            raise RuntimeError("Smoke task did not provide a quoted button name")
                        browser_command(session, port, "find", "role", "button", "click", "--name", target.group(1))
                        page.wait_for_function("() => WOB_DONE_GLOBAL", timeout=5000)
                    elif task_name == "399":
                        browser_command(session, port, "find", "role", "button", "click",
                                        "--name", "MarvelsGrantMan136")
                        trial["probeSnapshot"] = browser_command(session, port, "snapshot")
                        browser_command(session, port, "find", "role", "link", "click",
                                        "--name", "User settings")
                        trial["probeSettingsSnapshot"] = browser_command(session, port, "snapshot")
                        browser_command(session, port, "find", "role", "link", "click",
                                        "--name", "Edit biography")
                        trial["probeBiographySnapshot"] = browser_command(session, port, "snapshot")
                        if positive_control:
                            browser_command(session, port, "find", "role", "textbox", "fill",
                                            "--name", "Biography", "I am a robot")
                            browser_command(session, port, "find", "role", "button", "click",
                                            "--name", "Save")
                            trial["positiveControlUrl"] = page.url
                            trial["positiveControlSnapshot"] = browser_command(session, port, "snapshot")
                    elif task_name == "595":
                        if positive_control:
                            page.goto(
                                os.environ["REDDIT"]
                                + "/f/space/69581/the-moon-saturn-and-jupiter-through-my-4-telescope-and"
                            )
                            page.wait_for_load_state("domcontentloaded")
                            trial["probeSnapshot"] = browser_command(session, port, "snapshot")
                            refs = trial["probeSnapshot"].get("refs", {})
                            subscribed_ref = next((ref for ref, item in refs.items()
                                if item.get("role") == "button"
                                and item.get("name", "").startswith("Unsubscribe")), None)
                            if subscribed_ref:
                                browser_command(session, port, "click", f"@{subscribed_ref}")
                                page.wait_for_timeout(500)
                            current_snapshot = browser_command(session, port, "snapshot")
                            subscribe_ref = next((ref for ref, item in current_snapshot.get("refs", {}).items()
                                if item.get("role") == "button"
                                and item.get("name", "").startswith("Subscribe")), None)
                            if not subscribe_ref:
                                raise RuntimeError("Positive control could not find the forum Subscribe button")
                            browser_command(session, port, "click", f"@{subscribe_ref}")
                            page.wait_for_timeout(1500)
                            trial["positiveControlUrl"] = page.url
                            trial["positiveControlSnapshot"] = browser_command(session, port, "snapshot")
                else:
                    invocation = {"helperDir": str(helper_dir), "session": session,
                                  "taskName": task_name, "goal": goal}
                    result = command(["node", str(BRIDGE)], timeout=190,
                                     input_text=json.dumps(invocation))
                    response = json.loads(result.stdout)
                    trial.update(response)
                messages = ([{"role": "assistant", "message": webarena_response(
                    task, smoke or trial.get("result", {}).get("returnReason") == "reported_complete") }]
                    if suite == "webarena-verified" else [])
                evaluator_details = {}
                if suite == "webarena-verified":
                    evaluate_task = task.evaluator.evaluator.evaluate_task
                    def capture_evaluation(*, context):
                        if captured_trace:
                            supplemental = NetworkTrace.from_content(captured_trace)
                            supplemental_keys = {
                                (event.http_method, event.url)
                                for event in supplemental.events
                            }
                            merged_events = [
                                event for event in context.network_trace.events
                                if (event.http_method, event.url) not in supplemental_keys
                            ] + list(supplemental.events)
                            context = context.model_copy(update={
                                "network_trace": context.network_trace.model_copy(update={
                                    # BrowserGym's native HAR can contain an earlier duplicate
                                    # whose redirect request has no form body. Prefer the
                                    # Playwright response-backed copy for the same request so
                                    # official mutation evaluators see the submitted payload.
                                    "events": merged_events
                                })
                            })
                        result = evaluate_task(context=context)
                        evaluator_details.update({"status": str(result.status),
                            "score": result.score, "error": result.error_msg,
                            "evaluators": ([item.model_dump(mode="json")
                                for item in result.evaluators_results] if smoke else [
                                    {key: value for key, value in item.model_dump(mode="json").items()
                                     if key in {"evaluator", "status", "score", "error_msg"}}
                                    for item in result.evaluators_results])})
                        return result

                    task.evaluator.evaluator.evaluate_task = capture_evaluation
                reward, done, message, info = task.validate(page, messages)
                if evaluator_details:
                    trial["evaluatorDetails"] = evaluator_details
                if network_probe:
                    trial["networkProbe"] = network_probe
                trial.update({"reward": reward, "done": bool(done), "message": message,
                              "rewardInfo": info})
                passed = ((bool(trial.get("sharedPage")) and bool(trial.get("helperSessionPage"))
                           and ((reward == 1 and bool(done)) if suite == "miniwob" or positive_control
                                else reward < 1 and bool(done)))
                          if smoke else reward == 1 and bool(done))
                trial["verification"] = {"passed": passed,
                    "conditions": ({"sharedPage": trial.get("sharedPage"),
                                    "helperSessionPage": trial.get("helperSessionPage"),
                                    "gymReward": reward == 1, "gymDone": bool(done),
                                    "nonCompletionRejected": reward < 1 if suite == "webarena-verified" and not positive_control else None,
                                    "positiveControlPassed": reward == 1 if positive_control else None}
                                   if smoke else {"gymReward": reward == 1,
                                                  "gymDone": bool(done)})}
                trial["failureClass"] = "passed" if passed else "gym_reward_zero"
            except Exception as error:
                trial["error"] = str(error)
                trial["verification"] = {"passed": False,
                                          "conditions": {"infrastructure": False}}
                trial["failureClass"] = "infrastructure"
            finally:
                trial["elapsedMs"] = round((time.monotonic() - started) * 1000)
                if task:
                    task.teardown()
                if browser:
                    browser.close()
                try:
                    browser_command(session, port, "close")
                except Exception:
                    pass
                chrome.terminate()
                try:
                    chrome.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    chrome.kill()
                    chrome.wait(timeout=5)
    return trial


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline-dir")
    parser.add_argument("--candidate-dir")
    parser.add_argument("--suite", choices=("miniwob", "integration", "webarena-verified"), default="miniwob")
    parser.add_argument("--cases", default="click-button,choose-list,click-checkboxes,enter-text,use-autocomplete")
    parser.add_argument("--seeds", default="1,2,3")
    parser.add_argument("--smoke", action="store_true")
    parser.add_argument("--positive-control", action="store_true")
    parser.add_argument("--headed", action="store_true")
    parser.add_argument("--watch-delay-ms", type=int, default=0)
    parser.add_argument("--webarena-site")
    parser.add_argument("--webarena-reset-url")
    args = parser.parse_args()
    cases = args.cases.split(",")
    seeds = [int(value) for value in args.seeds.split(",")]
    allowed = (ALLOWED if args.suite == "miniwob" else WEBARENA_VERIFIED_ALLOWED
               if args.suite == "webarena-verified" else INTEGRATION_CASES)
    if not cases or any(case not in allowed or
                        (args.suite == "miniwob" and case not in TASKS) for case in cases):
        raise ValueError("Unknown or unsupported BrowserGym case")
    if args.smoke and ((args.suite == "miniwob" and cases[0] != "click-button") or
                       args.suite == "integration"):
        raise ValueError("Smoke mode requires MiniWoB click-button or a WebArena-Verified task")
    if args.positive_control and (not args.smoke or args.suite != "webarena-verified" or cases[0] not in {"399", "595"}):
        raise ValueError("The scripted positive control supports WebArena-Verified task 399 or 595")
    if args.suite == "webarena-verified" and (args.webarena_site != "reddit" or
                                                not args.webarena_reset_url):
        raise ValueError("WebArena-Verified requires the scoped reddit environment")
    if not seeds or any(seed < 0 or seed > 0xffffffff for seed in seeds):
        raise ValueError("Seeds must be unsigned 32-bit integers")
    if not 0 <= args.watch_delay_ms <= 60000:
        raise ValueError("Watch delay must be between 0 and 60000 milliseconds")
    if not args.smoke and not os.environ.get("OPENROUTER_API_KEY"):
        raise ValueError("OPENROUTER_API_KEY is required for a live study")
    server = None
    server_thread = None
    base_url = None
    if args.suite != "webarena-verified":
        server = ThreadingHTTPServer(("127.0.0.1", 0),
            partial(SimpleHTTPRequestHandler, directory=str(MINIWOB_ROOT))
            if args.suite == "miniwob" else IntegrationHandler)
        server_thread = threading.Thread(target=server.serve_forever, daemon=True)
        server_thread.start()
        base_url = f"http://127.0.0.1:{server.server_address[1]}"
        if args.suite == "miniwob":
            os.environ["MINIWOB_URL"] = base_url + "/miniwob/"
    report = {"schema": 1, "kind": f"browsergym-{args.suite}-study", "browsergymVersion": "0.14.3",
              "miniwobCommit": "7fd85d71a4b60325c6585396ec4f48377d049838" if args.suite == "miniwob" else None,
              "webarenaVerifiedVersion": package_version("webarena-verified") if args.suite == "webarena-verified" else None,
              "cases": [], "smoke": args.smoke, "headed": args.headed}
    report["positiveControl"] = args.positive_control
    try:
        with viewer_session() if args.headed else nullcontext():
            if args.smoke:
                if args.suite == "webarena-verified":
                    reset_webarena_verified(args.webarena_reset_url)
                report["cases"].append(run_case(cases[0], seeds[0], "smoke", None,
                                                suite=args.suite, base_url=base_url,
                                                smoke=True, positive_control=args.positive_control,
                                                headed=args.headed,
                                                watch_delay_ms=args.watch_delay_ms))
            else:
                with tempfile.TemporaryDirectory(prefix="jev-bgym-helpers-") as work:
                    helpers = {}
                    for arm, path in (("baseline", args.baseline_dir), ("candidate", args.candidate_dir)):
                        helpers[arm] = Path(work) / arm
                        prepare_helper(path, helpers[arm])
                    for seed in seeds:
                        for index, task_name in enumerate(cases):
                            order = ("baseline", "candidate") if (seed + index) % 2 else ("candidate", "baseline")
                            for arm in order:
                                if args.suite == "webarena-verified":
                                    reset_webarena_verified(args.webarena_reset_url)
                                report["cases"].append(run_case(task_name, seed, arm, helpers[arm],
                                                                 suite=args.suite, base_url=base_url,
                                                                 headed=args.headed,
                                                                 watch_delay_ms=args.watch_delay_ms))
    finally:
        if server:
            server.shutdown()
            server.server_close()
            server_thread.join(timeout=5)
    print(json.dumps(report))


if __name__ == "__main__":
    main()
