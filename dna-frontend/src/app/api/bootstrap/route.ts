import { NextRequest } from "next/server";
import { DNA_NODE_BIN, DNA_ROOT } from "@/lib/config";
import { fail, ok, readBody } from "@/lib/api-utils";
import fs from "fs";
import path from "path";
import { spawn, exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const BOOTSTRAP_URL = process.env.DNA_BOOTSTRAP_URL || "http://127.0.0.1:8090";
const BOOTSTRAP_LISTEN = process.env.DNA_BOOTSTRAP_LISTEN || "0.0.0.0:8090";
const PID_FILE = path.join(DNA_ROOT, "bootstrap.pid");
const LOG_FILE = path.join(DNA_ROOT, "bootstrap.log");

async function fetchBootstrapStatus() {
  try {
    const res = await fetch(`${BOOTSTRAP_URL}/status`, { cache: "no-store" });
    if (!res.ok) return { online: false, url: BOOTSTRAP_URL };
    const data = await res.json();
    return { online: true, url: BOOTSTRAP_URL, ...data };
  } catch {
    return { online: false, url: BOOTSTRAP_URL };
  }
}

function isRunning(): boolean {
  if (!fs.existsSync(PID_FILE)) return false;
  const pid = parseInt(fs.readFileSync(PID_FILE, "utf-8").trim(), 10);
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const status = await fetchBootstrapStatus();
  return ok({
    ...status,
    pidFile: PID_FILE,
    logFile: LOG_FILE,
    listen: BOOTSTRAP_LISTEN,
    processRunning: isRunning(),
  });
}

export async function POST(req: NextRequest) {
  const body = await readBody<{ action?: string; seeds?: string }>(req);
  const action = body.action || "status";

  if (action === "start") {
    if (isRunning()) {
      return ok({ message: "Bootstrap server already running", ...(await fetchBootstrapStatus()) });
    }
    const seeds =
      body.seeds ||
      "127.0.0.1:20338,127.0.0.1:20438,127.0.0.1:20538,127.0.0.1:20638";
    const child = spawn(
      DNA_NODE_BIN,
      ["bootstrap", "server", "--listen", BOOTSTRAP_LISTEN, "--seeds", seeds],
      { cwd: DNA_ROOT, detached: true, stdio: ["ignore", "pipe", "pipe"] }
    );
    const logStream = fs.createWriteStream(LOG_FILE, { flags: "a" });
    child.stdout?.pipe(logStream);
    child.stderr?.pipe(logStream);
    child.unref();
    fs.writeFileSync(PID_FILE, String(child.pid));
    await new Promise((r) => setTimeout(r, 800));
    return ok({ message: "Bootstrap server started", pid: child.pid, ...(await fetchBootstrapStatus()) });
  }

  if (action === "stop") {
    try {
      if (fs.existsSync(PID_FILE)) {
        const pid = parseInt(fs.readFileSync(PID_FILE, "utf-8").trim(), 10);
        if (pid) process.kill(pid, "SIGTERM");
        fs.unlinkSync(PID_FILE);
      }
      await execAsync("pkill -f 'dnaNode bootstrap server' || true", { cwd: DNA_ROOT });
    } catch {
      /* ignore */
    }
    return ok({ message: "Bootstrap server stopped" });
  }

  if (action === "refresh") {
    return ok(await fetchBootstrapStatus());
  }

  return fail("Unknown action");
}
