import { useEffect, useState, useMemo } from "react";
import {
  Trash2,
  AlertTriangle,
  Info,
  Server,
  Database,
  FileWarning,
  ShieldAlert,
  CheckCircle2,
  Loader2,
} from "lucide-react";

const STORAGE_KEY = "technitium_config";

const safeParse = (d) => {
  try {
    return JSON.parse(d);
  } catch {
    return null;
  }
};

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export default function App() {
  const [mounted, setMounted] = useState(false);
  const [config, setConfig] = useState(null);

  const [stateMap, setStateMap] = useState({
    stats: "idle",
    logs: "idle",
    allLogs: "idle",
  });

  const [snack, setSnack] = useState(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setConfig(safeParse(localStorage.getItem(STORAGE_KEY)));
  }, []);

  const validationError = useMemo(() => {
    if (!config) return "Missing configuration";

    try {
      if (!config.server) return "Server not found";
      const url = new URL(config.server);
      if (!["http:", "https:"].includes(url.protocol))
        return "Invalid server URL";
      if (!config.token || config.token.length < 8) return "Invalid API token";
      return null;
    } catch {
      return "Invalid server URL";
    }
  }, [config]);

  const base = useMemo(
    () => (config?.server ? config.server.replace(/\/$/, "") : ""),
    [config],
  );

  const showSnack = (msg) => {
    setSnack(msg);
    setTimeout(() => setSnack(null), 2500);
  };

  const api = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Network error");

    const json = await res.json();
    if (json.status !== "ok") {
      throw new Error(json.errorMessage || "API error");
    }

    return json.response;
  };

  const updateState = (type, value) => {
    setStateMap((prev) => ({ ...prev, [type]: value }));
  };

  const runDelete = async (type, url) => {
    if (stateMap[type] === "loading") return;

    const ok = window.confirm(
      "⚠️ This action is irreversible.\n\nDNS data will be permanently deleted.\n\nContinue?",
    );
    if (!ok) return;

    updateState(type, "loading");

    try {
      await delay(400);

      await api(url);

      await delay(300);

      updateState(type, "success");
      showSnack("Deleted successfully");

      await delay(900);

      updateState(type, "idle");
    } catch (e) {
      updateState(type, "idle");
      showSnack(e.message);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col bg-linear-to-br from-red-100 to-orange-100">
      {/* HEADER */}
      <div className="sticky top-0 bg-white/80 backdrop-blur border-b px-4 py-3 flex justify-center gap-2 font-semibold">
        <Server size={18} className="text-red-600" />
        DNS Danger Zone
      </div>

      <div className="max-w-md mx-auto w-full px-3 py-4 space-y-4 flex-1">
        {validationError ? (
          <div className="bg-white p-4 rounded-xl shadow border border-red-200 text-sm text-red-600">
            ⚠️ {validationError} — Configure API in localStorage.
          </div>
        ) : (
          <>
            {/* WARNING */}
            <div className="bg-red-50 border border-red-200 p-4 rounded-xl space-y-2 shadow-sm">
              <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
                <AlertTriangle size={16} />
                Critical DNS Operations
              </div>
              <div className="text-xs text-red-600 leading-relaxed">
                These actions permanently delete DNS logs and statistics. This
                removes monitoring history and cannot be undone.
              </div>
            </div>

            <DangerCard
              title="Delete All Stats (last hour)"
              desc="Clears analytics: clients, domains, blocked stats."
              icon={<Database />}
              state={stateMap.stats}
              onClick={() =>
                runDelete(
                  "stats",
                  `${base}/api/dashboard/stats/deleteAll?token=${config.token}`,
                )
              }
            />

            <DangerCard
              title="Delete All Logs"
              desc="Permanently delete all log files from the disk."
              icon={<ShieldAlert />}
              state={stateMap.allLogs}
              onClick={() =>
                runDelete(
                  "allLogs",
                  `${base}/api/logs/deleteAll?token=${config.token}`,
                )
              }
            />
          </>
        )}
      </div>

      {/* FOOTER */}
      <div className="text-gray-700 text-[11px] text-center p-4 border-t bg-white/70 font-semibold">
        Deleted DNS data cannot be recovered. Use only for maintenance or
        cleanup.
      </div>

      {/* SNACK */}
      {snack && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 max-w-[90vw] truncate bg-red-700 text-white px-4 py-2 rounded-lg text-xs flex gap-2 whitespace-nowrap shadow">
          <Info size={14} />
          <span className="truncate">{snack}</span>
        </div>
      )}
    </div>
  );
}

/* CARD */

const DangerCard = ({ title, desc, icon, onClick, state }) => {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3 transition active:scale-[0.99]">
      <div className="flex items-center gap-2 text-red-600 font-semibold text-sm">
        <div className="bg-red-100 p-2 rounded-md">{icon}</div>
        {title}
      </div>

      <div className="text-xs text-gray-600">{desc}</div>

      <div className="flex justify-end">
        <button
          onClick={onClick}
          disabled={state === "loading"}
          className="flex items-center gap-2 px-4 py-2 text-xs 
          bg-linear-to-r from-red-500 to-red-600 
          text-white rounded-lg shadow-md active:scale-95 
          disabled:opacity-50 transition"
        >
          {state === "loading" && (
            <Loader2 size={14} className="animate-spin" />
          )}
          {state === "success" && <CheckCircle2 size={14} />}
          {state === "idle" && <Trash2 size={14} />}

          {state === "loading"
            ? "Processing..."
            : state === "success"
              ? "Done"
              : "Delete"}
        </button>
      </div>
    </div>
  );
};
