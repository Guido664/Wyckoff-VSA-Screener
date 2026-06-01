import { useState, useEffect } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Database, 
  Calendar, 
  AlertCircle, 
  PieChart, 
  ShieldCheck, 
  User, 
  Layers, 
  Sparkles,
  Search,
  Activity
} from "lucide-react";
import TickerManager from "./components/TickerManager";
import ScannerResults from "./components/ScannerResults";
import StockChartModal from "./components/StockChartModal";
import { AnalysisResult, TickerHistoryBar } from "./types";

const DEFAULT_TICKERS = [
  "ENI.MI", "UKRN.MI", "UCG.MI", "RACE.MI", "STLAM.MI", "STMMI.MI", 
  "ENEL.MI", "G.MI", "PRY.MI", "AZM.MI", "WBD.MI", "QTOP.MI", 
  "BAMI.MI", "LDO.MI", "FBK.MI", "1AMZN.MI", "PST.MI", "SRG.MI", 
  "TEN.MI", "1NVDA.MI", "SEME.MI", "VWCE.MI", "1HEI.MI", "1HOLN.MI",
  "ISPY", "1GOOGL", "1AAPL", "1MSFT"
];

export default function App() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);

  // States per visualizzazione grafico candele singolo ticker
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<TickerHistoryBar[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // 1. Inizializzazione Ticker da LocalStorage o Default
  useEffect(() => {
    try {
      const stored = localStorage.getItem("wyckoff_tickers");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTickers(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn("Errore durante il recupero dei ticker da localStorage:", e);
    }
    setTickers(DEFAULT_TICKERS);
  }, []);

  // Preservazione automatica dei Tickers nello stato locale al variare delle preferenze utente
  const handleTickersChange = (newTickers: string[]) => {
    setTickers(newTickers);
    try {
      localStorage.setItem("wyckoff_tickers", JSON.stringify(newTickers));
    } catch (e) {
      console.warn("Errore salvataggio tickers in localStorage:", e);
    }
  };

  // Reset alle impostazioni di fabbrica italiana
  const handleResetTickers = () => {
    if (window.confirm("Ripristinare l'elenco dei 24 ticker italiani predefiniti?")) {
      setTickers(DEFAULT_TICKERS);
      try {
        localStorage.setItem("wyckoff_tickers", JSON.stringify(DEFAULT_TICKERS));
      } catch (e) {
        console.warn(e);
      }
    }
  };

  // 2. Chiamata server-side screener quantitativo
  const runMarketScan = async () => {
    if (tickers.length === 0) {
      setErrorMsg("Nessun ticker disponibile per la scansione.");
      return;
    }

    setIsLoadingResults(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/screener", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tickers }),
      });

      if (!response.ok) {
        let serverErr = `Risposta anomala del server: ${response.status}`;
        try {
          const errData = await response.json();
          if (errData && errData.details) {
            serverErr += ` (Dettaglio: ${errData.details})`;
          } else if (errData && errData.error) {
            serverErr += ` (Dettaglio: ${errData.error})`;
          }
        } catch (_) {}
        throw new Error(serverErr);
      }

      const data = await response.json();
      if (data.success) {
        setResults(data.data || []);
        setIsDemoMode(!!data.isDemoMode);
        setLastScanTime(new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }));
      } else {
        throw new Error(data.error || "Errore generico dal server screener");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Errore scansione di mercato: ${err.message}. Riprovare più tardi.`);
    } finally {
      setIsLoadingResults(false);
    }
  };

  // Esegui la scansione al montaggio del componente (quando tickers è pronto)
  useEffect(() => {
    if (tickers.length > 0) {
      runMarketScan();
    }
  }, [tickers.length === 0]); // Esegui solo la prima volta al caricamento iniziale dei ticker

  // 3. Gestore caricamento storico ed apertura Modal Grafico
  const handleSelectTicker = async (ticker: string) => {
    setSelectedTicker(ticker);
    setIsLoadingHistory(true);
    setHistoryData([]);

    try {
      const response = await fetch(`/api/ticker-history?ticker=${encodeURIComponent(ticker)}`);
      if (!response.ok) {
        throw new Error(`Errore di rete nell'analisi storica: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setHistoryData(data.history || []);
      } else {
        throw new Error(data.error || "Impossibile recuperare lo storico.");
      }
    } catch (err: any) {
      console.error(err);
      // In caso di errore serio, carichiamo dei dati storici vuoti per far mostrare il messaggio nel modal
      setHistoryData([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // KPI statici dedotti per il cruscotto di trading
  const summaryMetrics = {
    totalScanned: results.length,
    buySignalsCount: results.filter(r => r.SEGNALE_OPERATIVO === "POTENZIALE BUY").length,
    sellSignalsCount: results.filter(r => r.SEGNALE_OPERATIVO === "POTENZIALE SELL").length,
    lastUpdateDate: new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }),
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-12 selection:bg-indigo-500/30 selection:text-white" id="wyckoff-app-root">
      
      {/* HEADER DECORATIONS (ANTI-SLOP: CLEAN, PROFESSIONAL HEADERS ONLY, NO TELEMETRY OR SIMULATED CONSOLE METADATA) */}
      <header className="bg-slate-900/50 border-b border-slate-800 sticky top-0 z-30 shadow-lg backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white uppercase flex items-center gap-1.5 leading-none">
                Wyckoff / VSA Assistant
                <span className="text-[9px] bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded uppercase tracking-wider font-sans">
                  PRO
                </span>
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium tracking-widest uppercase mt-1 leading-none">
                Analisi Quantitativa Borsa Italiana
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden xs:flex flex-col text-right leading-tight">
              <p className="text-sm font-semibold text-slate-300">{summaryMetrics.lastUpdateDate}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5 flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                Market Status: Open
              </p>
            </div>
            
            <button
              onClick={runMarketScan}
              disabled={isLoadingResults}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-lg text-xs transition-all shadow-md active:scale-95 cursor-pointer shadow-indigo-600/10"
              id="btn-screener-header-scan"
            >
              <RefreshCw size={12} className={isLoadingResults ? "animate-spin" : ""} />
              <span>Avvia Scansione</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        
        {/* CRUSCOTTO HIGHLIGHT CARDS (KPI BOX) */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-dashboard-metrics">
          
          {/* SEC. A: TOTALE SCANSIONI */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-md">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 rounded-xl flex-shrink-0">
              <Database size={18} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Asset Monitorati</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-bold font-mono text-slate-100">
                  {summaryMetrics.totalScanned || tickers.length}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">/{tickers.length}</span>
              </div>
            </div>
          </div>

          {/* SEC. B: SEGNALI BUY */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-md">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-xl flex-shrink-0">
              <TrendingUp size={18} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Segnali Buy</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-bold font-mono text-emerald-400 col-span-1">
                  {isLoadingResults ? "-" : summaryMetrics.buySignalsCount}
                </span>
                <span className="text-[10px] text-slate-500 font-serif">Setup</span>
              </div>
            </div>
          </div>

          {/* SEC. C: SEGNALI SELL */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-md">
            <div className="p-3 bg-rose-500/10 text-rose-400 border border-rose-500/25 rounded-xl flex-shrink-0">
              <TrendingDown size={18} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Segnali Sell</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-bold font-mono text-rose-400">
                  {isLoadingResults ? "-" : summaryMetrics.sellSignalsCount}
                </span>
                <span className="text-[10px] text-slate-500 font-serif">Setup</span>
              </div>
            </div>
          </div>

          {/* SEC. D: STATO SYSTEM */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-md col-span-2 lg:col-span-1">
            <div className="p-3 bg-slate-950 text-slate-400 border border-slate-850 rounded-xl flex-shrink-0">
              <RefreshCw size={18} className={isLoadingResults ? "animate-spin" : ""} />
            </div>
            <div className="flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Ultimo Scan</span>
              <span className="text-xs font-mono font-semibold text-slate-300 block mt-0.5">
                {isLoadingResults ? "In corso..." : lastScanTime || "Non eseguito"}
              </span>
            </div>
          </div>

        </section>

        {/* ERROR DISPLAY */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-550/20 text-red-400 rounded-xl p-4 flex items-start gap-3 text-sm" id="banner-global-screener-error">
            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <span className="font-semibold block">Attenzione, errore quant</span>
              <p className="text-xs text-slate-300 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* CONTENUTO GRID PRINCIPALE: sinistra ticker management, destra risultati dei segnali (Desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* SEZIONE SINISTRA: Gestione titoli */}
          <section className="col-span-12 lg:col-span-3 space-y-5">
            <TickerManager 
              tickers={tickers} 
              onTickersChange={handleTickersChange}
              onReset={handleResetTickers}
            />

            {/* BOX EDUCATIVO METEDOLOGIA */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md space-y-2.5 text-left text-[11px] md:text-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Layers size={13} className="text-indigo-400" />
                Cos'è il Metodo Wyckoff/VSA?
              </h3>
              <p className="text-slate-400 leading-relaxed text-[11px] md:text-xs">
                Ideato da Richard Wyckoff, analizza le intenzioni degli investitori istituzionali (il "Composite Man") individuando fasi di <strong>Accumulazione</strong> (acquisti) e <strong>Distribuzione</strong> (vendite).
              </p>
              <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg text-[10px] md:text-[11px] text-indigo-400 leading-relaxed font-sans">
                💡 <em>"Il prezzo non si muove mai a caso. Riflette le costanti dinamiche di offerta e domanda."</em>
              </div>
            </div>
          </section>

          {/* SEZIONE DESTRA: Risultati Screener */}
          <section className="col-span-12 lg:col-span-9 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                  Report Quantitativo Prezzo-Volume
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Risultati della scansione ordinati per setup operativi seguiti da anomalie volume/media decrescenti.
                </p>
              </div>
            </div>

            <ScannerResults
              results={results}
              isLoading={isLoadingResults}
              isDemoMode={isDemoMode}
              onSelectTicker={handleSelectTicker}
              onTriggerScan={runMarketScan}
            />
          </section>

        </div>

      </main>

      {/* VISUALIZZATORE COMPONENT MODALE GRAFICO CANDELI */}
      {selectedTicker && (
        <StockChartModal
          ticker={selectedTicker}
          history={historyData}
          onClose={() => setSelectedTicker(null)}
          isLoading={isLoadingHistory}
        />
      )}

      {/* FOOTER STRUCTURED PATTERN FROM ELEGANT DARK TEMPLATE */}
      <footer className="bg-slate-950 border-t border-slate-800 px-8 py-6 mt-12 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
        <div className="text-xs text-slate-500 font-mono">System Engine: v2.4.0-wyckoff</div>
        <div className="flex gap-6">
          <span className="text-xs text-indigo-400 font-semibold cursor-pointer hover:text-indigo-300">Termini e Condizioni</span>
          <span className="text-xs text-slate-500">© 2026 VSA Decision Assistant</span>
        </div>
      </footer>

    </div>
  );
}
