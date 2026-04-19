import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  RefreshCw,
  Trash2,
  Info,
  Globe,
  Key,
  Server,
  Users,
  Shield,
  Database,
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

  const [clients, setClients] = useState([]);
  const [domains, setDomains] = useState([]);
  const [blockedDomains, setBlockedDomains] = useState([]);

  const [loading, setLoading] = useState(false);
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

  const showSnack = (msg) => {
    setSnack(msg);
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
      const [c, d, b] = await Promise.all([
        api(
          `${base}/api/dashboard/stats/getTop?type=LastHour&statsType=TopClients&limit=10&token=${config.token}`,
          abortRef.current.signal,
        ),
        api(
          `${base}/api/dashboard/stats/getTop?type=LastHour&statsType=TopDomains&limit=10&token=${config.token}`,
          abortRef.current.signal,
        ),
        api(
          `${base}/api/dashboard/stats/getTop?type=LastHour&statsType=TopBlockedDomains&limit=10&token=${config.token}`,
          abortRef.current.signal,
        ),
      ]);

      setClients(c.topClients || []);
      setDomains(d.topDomains || []);
      setBlockedDomains(b.topBlockedDomains || []);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

      if (manualRef.current) {
        showSnack("Updated successfully");
        manualRef.current = false;
      }
    } catch (e) {
      if (e.name !== "AbortError") showSnack(e.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, config.token, validationError]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchAll, 500);
    return () => clearTimeout(debounceRef.current);
  }, [fetchAll]);

  const clearStorage = () => {
    localStorage.removeItem(STORAGE_KEY);
    setConfig({ server: "", token: "" });
    showSnack("Configuration cleared");
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col bg-linear-to-br from-purple-100 to-indigo-100">
      {/* HEADER */}
      <div className="sticky top-0 bg-white/80 backdrop-blur border-b px-4 py-3 flex items-center justify-center gap-2 font-semibold text-gray-800 shadow-sm">
        <Server size={18} className="text-purple-600" />
        Technitium DNS
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
            <div className="text-red-500 text-xs">{validationError}</div>
          </div>
        )}

        {!validationError && (
          <>
            {/* REFRESH */}
            <div className="flex justify-center">
              <button
                onClick={async () => {
                  if (loading) return;
                  manualRef.current = true;
                  await sleep(150);
                  fetchAll();
                }}
                className="px-6 py-2 text-sm rounded-lg flex items-center justify-center 
                bg-linear-to-r from-purple-600 to-indigo-600 
                text-white shadow active:scale-95 transition"
              >
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
              </button>
            </div>

            {/* CARDS */}
            <Card title="Top Clients" icon={<Users />} color="green">
              {clients.map((c, i) => (
                <Row key={i} label={c.name || c.client} value={c.hits} />
              ))}
            </Card>

            <Card title="Top Domains" icon={<Database />} color="blue">
              {domains.map((d, i) => (
                <Row key={i} label={d.name || d.domain} value={d.hits} />
              ))}
            </Card>

            <Card title="Blocked Domains" icon={<Shield />} color="red">
              {blockedDomains.map((b, i) => (
                <Row key={i} label={b.name || b.domain} value={b.hits} />
              ))}
            </Card>

            {/* CLEAR */}
            <div className="bg-white p-4 rounded-xl shadow space-y-3">
              <div className="flex gap-2 text-sm text-gray-600">
                Removes stored API URL & token from this browser.
              </div>

              <div className="flex justify-center">
                <button
                  onClick={clearStorage}
                  className="px-6 py-2 text-sm bg-red-500 text-white rounded-lg flex items-center gap-2 shadow active:scale-95"
                >
                  <Trash2 size={14} /> Clear
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* FOOTER */}
      <div className="text-gray-700 text-[11px] text-center p-4 border-t bg-white/70 leading-relaxed font-semibold">
        Your API data stays only in your browser (localStorage). It is never
        shared or stored externally. This dashboard communicates directly with
        your DNS server using your API token securely.
      </div>

      {/* SNACKBAR */}
      {snack && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 
        max-w-[90vw] truncate
        bg-purple-700 text-white px-4 py-2 rounded-lg text-xs shadow flex items-center gap-2 whitespace-nowrap"
        >
          <Info size={14} className="shrink-0" />
          <span className="truncate">{snack}</span>
        </div>
      )}
    </div>
  );
}

/* COMPONENTS */

const Input = ({ icon, value, onChange, placeholder }) => (
  <div className="flex items-center gap-2 border p-2.5 rounded-lg bg-gray-50">
    <div className="bg-gray-200 p-1.5 rounded-md">{icon}</div>
    <input
      className="flex-1 outline-none text-sm bg-transparent"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

const Card = ({ title, icon, children, color }) => {
  const colorMap = {
    green: "bg-green-100 text-green-600",
    blue: "bg-blue-100 text-blue-600",
    red: "bg-red-100 text-red-600",
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow space-y-3">
      <div className="flex items-center gap-2 font-semibold text-sm">
        <div className={`p-1.5 rounded-md ${colorMap[color]}`}>{icon}</div>
        {title}
      </div>
      {children}
    </div>
  );
};

const Row = ({ label, value }) => (
  <div className="flex justify-between items-start gap-2 text-sm border-b pb-1">
    <span className="wrap-break-word whitespace-pre-wrap max-w-[75%] text-gray-700">
      {label}
    </span>
    <span className="font-semibold text-gray-900 shrink-0">
      {formatNumber(value)}
    </span>
  </div>
);
