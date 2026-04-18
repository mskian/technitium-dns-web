import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  Ban,
  RefreshCw,
  Trash2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Activity,
  Database,
  Shield,
  Users,
  Server,
  Info,
  AlertCircle,
  Globe,
  Key,
  ShieldCheck,
  Zap,
  RotateCw,
} from "lucide-react";

const STORAGE_KEY = "technitium_config";

const safeParse = (d) => {
  try {
    return JSON.parse(d);
  } catch {
    return null;
  }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const formatNumber = (n = 0) =>
  n >= 1e6
    ? (n / 1e6).toFixed(1).replace(".0", "") + "M"
    : n >= 1e3
      ? (n / 1e3).toFixed(1).replace(".0", "") + "K"
      : n;

export default function App() {
  const [mounted, setMounted] = useState(false);
  const [config, setConfig] = useState(
    () =>
      safeParse(localStorage.getItem(STORAGE_KEY)) || { server: "", token: "" },
  );

  const [stats, setStats] = useState(null);
  const [block, setBlock] = useState(false);
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [initialLoading, setInitialLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [cacheDone, setCacheDone] = useState(false);

  const [snack, setSnack] = useState(null);

  const abortRef = useRef(null);
  const debounceRef = useRef(null);
  const manualRef = useRef(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const validationError = useMemo(() => {
    try {
      if (!config.server) return "Server required";
      const url = new URL(config.server);
      if (!["http:", "https:"].includes(url.protocol))
        return "Invalid protocol";
      if (!config.token || config.token.length < 8) return "Token too short";
      return null;
    } catch {
      return "Invalid URL";
    }
  }, [config]);

  const base = useMemo(() => config.server.replace(/\/$/, ""), [config.server]);

  const showSnack = (msg, type = "info") => {
    setSnack({ msg, type });
    setTimeout(() => setSnack(null), 2500);
  };

  const api = async (url, signal) => {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error("Network error");
    const j = await res.json();
    if (j.status !== "ok") throw new Error(j.errorMessage || "API error");
    return j.response;
  };

  const fetchAll = useCallback(async () => {
    if (validationError) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);

    try {
      const [s, settings, l] = await Promise.all([
        api(
          `${base}/api/dashboard/stats/get?type=LastHour&utc=true&token=${config.token}`,
          abortRef.current.signal,
        ),
        api(
          `${base}/api/settings/get?token=${config.token}`,
          abortRef.current.signal,
        ),
        api(
          `${base}/api/logs/query?name=Query Logs (Sqlite)&classPath=QueryLogsSqlite.App&pageNumber=${page}&entriesPerPage=20&descendingOrder=true&token=${config.token}`,
          abortRef.current.signal,
        ),
      ]);

      setStats(s.stats || s);
      setBlock(settings.enableBlocking === true);
      setLogs(l.entries || []);
      setTotalPages(l.totalPages || 1);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

      if (manualRef.current) {
        showSnack("Data refreshed", "success");
        manualRef.current = false;
      }
    } catch (e) {
      if (e.name !== "AbortError") showSnack(e.message, "error");
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, config.token, page, validationError]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchAll, 700);
    return () => clearTimeout(debounceRef.current);
  }, [fetchAll]);

  const toggleBlock = async () => {
    if (actionLoading) return;
    setActionLoading("block");

    try {
      await sleep(300);
      await api(
        `${base}/api/settings/set?enableBlocking=${!block}&token=${config.token}`,
      );
      setBlock(!block);
      showSnack("AdBlock updated", "success");
    } finally {
      setActionLoading(null);
    }
  };

  const flushCache = async () => {
    if (actionLoading) return;
    setActionLoading("flush");

    try {
      await sleep(400);
      await api(`${base}/api/cache/flush?token=${config.token}`);
      setCacheDone(true);
      showSnack("Cache flushed", "success");
      setTimeout(() => setCacheDone(false), 2000);
    } finally {
      setActionLoading(null);
    }
  };

  const clearStorage = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setConfig({ server: "", token: "" });
      showSnack("Local data cleared", "success");
    } catch {
      showSnack("Failed to clear data", "error");
    }
  };

  const getStatusMeta = (type) => {
    if (!type)
      return { color: "bg-gray-200 text-gray-600", icon: <Info size={12} /> };

    const t = type.toLowerCase();

    if (t.includes("blocked")) {
      return { color: "bg-red-100 text-red-600", icon: <Ban size={12} /> };
    }
    if (t.includes("cached")) {
      return { color: "bg-green-100 text-green-600", icon: <Zap size={12} /> };
    }
    if (t.includes("recursive")) {
      return {
        color: "bg-yellow-100 text-yellow-700",
        icon: <RotateCw size={12} />,
      };
    }
    return { color: "bg-gray-100 text-gray-600", icon: <Info size={12} /> };
  };

  if (!mounted) return <div className="min-h-screen bg-white" />;

  return (
    <div className="min-h-screen flex flex-col bg-purple-200">
      <div className="sticky top-0 bg-white/70 backdrop-blur border-b p-3 flex justify-center gap-2 font-semibold text-green-900">
        <Server size={20} className="text-red-800" /> Technitium DNS
      </div>

      <div className="max-w-md mx-auto w-full px-3 py-4 space-y-4 flex-1">
        {validationError && (
          <div className="bg-white p-4 rounded-xl shadow space-y-3">
            <Input
              icon={<Globe size={16} />}
              value={config.server}
              placeholder="Server URL"
              onChange={(v) => setConfig({ ...config, server: v })}
            />
            <Input
              icon={<Key size={16} />}
              value={config.token}
              placeholder="API Token"
              onChange={(v) => setConfig({ ...config, token: v })}
            />
            <div className="text-red-500 text-sm">{validationError}</div>
          </div>
        )}

        {!validationError && (
          <>
            {/* TOGGLE */}
            <div className="bg-white p-4 rounded-2xl shadow flex justify-between items-center">
              <div className="flex gap-3 items-center">
                <Ban className={block ? "text-green-500" : "text-red-500"} />
                <div>
                  <div className="text-xs text-gray-500">Ad Blocking</div>
                  <div className="font-semibold">
                    {block ? "Enabled" : "Disabled"}
                  </div>
                </div>
              </div>

              <button
                onClick={toggleBlock}
                className={`w-12 h-7 flex items-center rounded-full p-1 transition shadow-inner
  ${
    block
      ? "bg-linear-to-r from-green-400 to-green-600"
      : "bg-linear-to-r from-red-400 to-red-600"
  }`}
              >
                <div
                  className={`bg-white w-5 h-5 rounded-full shadow transform transition
    ${block ? "translate-x-5" : ""}`}
                />
              </button>
            </div>

            {/* ACTIONS */}
            <div className="flex gap-2">
              <button
                onClick={flushCache}
                className={`flex-1 py-3 rounded-xl flex justify-center items-center 
  shadow-md active:scale-95 transition
  ${
    cacheDone
      ? "bg-green-700 text-white"
      : "bg-linear-to-br from-yellow-300 via-yellow-400 to-orange-400"
  }`}
              >
                {actionLoading === "flush" ? (
                  <RefreshCw className="animate-spin" />
                ) : cacheDone ? (
                  <CheckCircle2 className="text-white" />
                ) : (
                  <Trash2 />
                )}
              </button>

              <button
                onClick={async () => {
                  if (loading) return;
                  manualRef.current = true;
                  setLoading(true);
                  await sleep(350);
                  fetchAll();
                }}
                className="flex-1 py-3 rounded-xl flex justify-center items-center 
  bg-linear-to-br from-purple-600 via-purple-500 to-indigo-600 
  text-white shadow-md active:scale-95 transition"
              >
                <RefreshCw className={loading ? "animate-spin" : ""} />
              </button>
            </div>

            {/* STATS */}
            {stats && (
              <div className="grid grid-cols-2 gap-3">
                <Stat
                  icon={<Activity className="text-blue-500" />}
                  label="Queries"
                  value={formatNumber(stats.totalQueries)}
                />
                <Stat
                  icon={<Database className="text-indigo-500" />}
                  label="Cached"
                  value={formatNumber(stats.totalCached)}
                />
                <Stat
                  icon={<Shield className="text-red-500" />}
                  label="Blocked"
                  value={formatNumber(stats.totalBlocked)}
                />
                <Stat
                  icon={<Users className="text-green-500" />}
                  label="Clients"
                  value={formatNumber(stats.totalClients)}
                />
              </div>
            )}

            {/* LOGS */}
            <div className="bg-white p-4 rounded-xl shadow">
              <div className="flex items-center gap-2 font-semibold mb-2">
                <Activity size={16} /> Query Logs
              </div>

              <div className="space-y-2">
                {logs.map((l, i) => {
                  const meta = getStatusMeta(l.responseType);

                  return (
                    <div key={i} className="border p-3 rounded-lg bg-white/70">
                      <div className="flex items-center gap-2 text-sm font-medium break-all">
                        <Globe size={14} className="text-blue-500 shrink-0" />
                        {l.qname}
                      </div>

                      <div className="flex justify-between items-center mt-1 text-xs">
                        <span
                          className={`flex items-center gap-1 px-2 py-1 rounded-full ${meta.color}`}
                        >
                          {meta.icon}
                          {l.responseType}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between mt-3">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className={`p-1 rounded ${page === 1 ? "opacity-30 cursor-not-allowed" : "active:scale-90"}`}
                >
                  <ChevronLeft />
                </button>
                <span>
                  {page}/{totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className={`p-1 rounded ${page === totalPages ? "opacity-30 cursor-not-allowed" : "active:scale-90"}`}
                >
                  <ChevronRight />
                </button>
              </div>
            </div>
            {/* ✅ CLEAR STORAGE CARD */}
            <div className="max-w-md mx-auto w-full px-3 pb-3">
              <div className="bg-white/80 backdrop-blur border rounded-2xl shadow p-4 space-y-3">
                {/* TEXT */}
                <div className="flex items-start gap-3">
                  <AlertCircle
                    size={18}
                    className="text-red-500 mt-0.5 shrink-0"
                  />
                  <div>
                    <div className="text-sm font-semibold text-gray-800">
                      Clear Stored API Data
                    </div>
                    <div className="text-xs text-gray-500 leading-relaxed">
                      This will remove your saved server URL and API token from
                      localStorage. Useful when using a public or shared device.
                    </div>
                  </div>
                </div>

                {/* BUTTON */}
                <button
                  onClick={clearStorage}
                  className="w-full flex items-center justify-center gap-2 
      bg-linear-to-r from-red-500 to-red-600 
      text-white text-xs font-semibold py-2.5 rounded-xl 
      shadow active:scale-95 transition"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* FOOTER */}
      <div className="text-red-600 text-xs font-semibold leading-relaxed text-center p-4 border-t bg-white/70 flex items-start justify-center gap-2">
        Your data is stored only in your browser (localStorage). No external
        servers store your data. Fully private and secure.
      </div>

      {/* SNACKBAR */}
      {snack && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 
    flex items-center gap-2 px-4 py-2 rounded-lg 
    text-white text-xs whitespace-nowrap 
    shadow bg-purple-700 backdrop-blur font-semibold"
        >
          <Info size={14} />
          <span>{snack.msg}</span>
        </div>
      )}
    </div>
  );
}

/* COMPONENTS */
const Input = ({ icon, value, onChange, placeholder }) => (
  <div className="flex items-center gap-2 border p-3 rounded-xl bg-white">
    {icon}
    <input
      className="flex-1 outline-none"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

const Stat = ({ icon, label, value }) => (
  <div className="bg-white p-4 rounded-xl shadow flex items-center gap-2">
    {icon}
    <div>
      <div className="text-xs">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  </div>
);
