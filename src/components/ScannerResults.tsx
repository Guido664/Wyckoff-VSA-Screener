import { useState } from "react";
import { Search, AlertTriangle, ArrowUpDown, ChevronRight, Activity, TrendingUp, TrendingDown, RefreshCw, Download, Copy, Check } from "lucide-react";
import { AnalysisResult } from "../types";

interface ScannerResultsProps {
  results: AnalysisResult[];
  isLoading: boolean;
  isDemoMode: boolean;
  onSelectTicker: (ticker: string) => void;
  onTriggerScan: () => void;
}

export default function ScannerResults({
  results,
  isLoading,
  isDemoMode,
  onSelectTicker,
  onTriggerScan,
}: ScannerResultsProps) {
  const [search, setSearch] = useState("");
  const [signalFilter, setSignalFilter] = useState<"ALL" | "BUY" | "SELL" | "HOLD">("ALL");
  const [sortBy, setSortBy] = useState<"DEFAULT" | "PRICE" | "VOLUME">("DEFAULT");
  const [copied, setCopied] = useState(false);

  // Trova e filtra i segnali operativi BUY e SELL esportabili
  const exportableSignals = results.filter(
    (r) => r.SEGNALE_OPERATIVO === "POTENZIALE BUY" || r.SEGNALE_OPERATIVO === "POTENZIALE SELL"
  );

  const handleExportText = () => {
    if (exportableSignals.length === 0) return;

    // Formato richiesto: "ticker - prezzo - segnale - stop loss"
    const textContent = exportableSignals
      .map((r) => {
        const stopLossClean = r.Stop_Loss_Teorico === "-" ? "-" : `${r.Stop_Loss_Teorico.replace(" euro", "")} €`;
        return `${r.Ticker} - ${r.Prezzo_eur.toFixed(2)} EUR - ${r.SEGNALE_OPERATIVO} - ${stopLossClean}`;
      })
      .join("\n");

    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `segnali_wyckoff_vsa.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyToClipboard = () => {
    if (exportableSignals.length === 0) return;

    // Formato richiesto: "ticker - prezzo - segnale - stop loss"
    const textContent = exportableSignals
      .map((r) => {
        const stopLossClean = r.Stop_Loss_Teorico === "-" ? "-" : `${r.Stop_Loss_Teorico.replace(" euro", "")} €`;
        return `${r.Ticker} - ${r.Prezzo_eur.toFixed(2)} EUR - ${r.SEGNALE_OPERATIVO} - ${stopLossClean}`;
      })
      .join("\n");

    navigator.clipboard.writeText(textContent).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    });
  };

  // Filtra e ordina i risultati
  const filteredResults = results
    .filter((r) => {
      const matchSearch = r.Ticker.toLowerCase().includes(search.toLowerCase());
      if (signalFilter === "ALL") return matchSearch;
      if (signalFilter === "BUY") return matchSearch && r.SEGNALE_OPERATIVO === "POTENZIALE BUY";
      if (signalFilter === "SELL") return matchSearch && r.SEGNALE_OPERATIVO === "POTENZIALE SELL";
      if (signalFilter === "HOLD") return matchSearch && r.SEGNALE_OPERATIVO === "HOLD / NEUTRO";
      return matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === "PRICE") {
        return b.Prezzo_eur - a.Prezzo_eur;
      }
      if (sortBy === "VOLUME") {
        return b.Raw_Volume_Ratio - a.Raw_Volume_Ratio;
      }
      // Di default: Ordinamento da server (Wyckoff Priority + Volume Ratio canali decrescenti)
      return 0; // mantiene l'ordine preesistente
    });

  const getSignalBadgeStyle = (signal: string) => {
    if (signal === "POTENZIALE BUY") {
      return "bg-emerald-950/40 border border-emerald-500/30 text-emerald-400";
    }
    if (signal === "POTENZIALE SELL") {
      return "bg-rose-950/40 border border-rose-500/30 text-rose-400";
    }
    return "bg-slate-950 border border-slate-800 text-slate-400";
  };

  const getStatusStyle = (status: string) => {
    if (status.includes("Spring") || status.includes("Accumulazione")) {
      return "text-emerald-400 font-semibold";
    }
    if (status.includes("Upthrust") || status.includes("Distribuzione")) {
      return "text-rose-400 font-semibold";
    }
    return "text-slate-400";
  };

  const formatVolume = (valString: string) => {
    const numeric = parseFloat(valString.replace("%", ""));
    const isPositive = numeric >= 0;
    return (
      <span className={`font-mono font-medium ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
        {valString}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between shadow-lg">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 text-slate-500" size={16} />
          <input
            type="text"
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-500 transition-all font-sans"
            placeholder="Cerca per ticker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="input-search-ticker"
          />
        </div>

        {/* Filters and sorting */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Signal selector */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setSignalFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                signalFilter === "ALL"
                  ? "bg-slate-850 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              id="filter-signal-all"
            >
              Tutti
            </button>
            <button
              onClick={() => setSignalFilter("BUY")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                signalFilter === "BUY"
                  ? "bg-emerald-950/60 text-emerald-400 shadow font-bold"
                  : "text-slate-400 hover:text-emerald-400"
              }`}
              id="filter-signal-buy"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              BUY
            </button>
            <button
              onClick={() => setSignalFilter("SELL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                signalFilter === "SELL"
                  ? "bg-rose-950/60 text-rose-400 shadow font-bold"
                  : "text-slate-400 hover:text-rose-400"
              }`}
              id="filter-signal-sell"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              SELL
            </button>
          </div>

          {/* Sort Menu */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
            <ArrowUpDown size={12} className="text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-slate-300 text-xs font-medium outline-none cursor-pointer"
              id="sort-results-enum"
            >
              <option value="DEFAULT">Ordina: Wyckoff</option>
              <option value="PRICE">Ordina: Prezzo</option>
              <option value="VOLUME">Ordina: Volumi Anomali</option>
            </select>
          </div>

          {/* Export Signals Option */}
          {exportableSignals.length > 0 && (
            <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800" id="export-actions-wrapper">
              <button
                onClick={handleExportText}
                className="flex items-center gap-1 px-2.5 py-1 text-slate-300 hover:text-indigo-300 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:bg-slate-900"
                title="Esporta l'elenco dei segnali in formato TXT"
                id="btn-export-txt"
              >
                <Download size={13} className="text-indigo-400" />
                <span>Esporta TXT</span>
              </button>
              <div className="w-[1px] h-3.5 bg-slate-800" />
              <button
                onClick={handleCopyToClipboard}
                className="flex items-center gap-1 px-2.5 py-1 text-slate-300 hover:text-indigo-300 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:bg-slate-900"
                title="Copia l'elenco di tutti i segnali negli appunti"
                id="btn-export-copy"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} className="text-indigo-400" />}
                <span>{copied ? "Copiato!" : "Copia negli Appunti"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Demo mode indicator */}
      {isDemoMode && !isLoading && results.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 text-xs text-amber-300" id="demo-mode-warning-banner">
          <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold block mb-0.5">Scansione in Modalità Simulazione</span>
            La chiamata diretta alle API quantitative di Yahoo Finance è disconnessa o temporaneamente sospesa. I dati di mercato sono stati rigenerati in locale basandosi sulle ultime relazioni storiche e le anomalie volumetriche quantitative reali per consentire lo studio reattivo del modello.
          </div>
        </div>
      )}

      {/* Primary Screener Content */}
      {isLoading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center space-y-4 shadow-lg min-h-[300px]" id="results-loader">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-indigo-950 border-t-indigo-500 rounded-full animate-spin"></div>
            <Activity size={18} className="absolute inset-0 m-auto text-indigo-400 animate-pulse" />
          </div>
          <div className="text-center">
            <h3 className="text-slate-200 font-semibold text-sm">Analisi Quantitativa in corso...</h3>
            <p className="text-slate-500 text-xs mt-1 max-w-xs font-sans">
              Scaricamento dati storici, calcolo medie mobili SMA50 e SMA20 e verifica oscillatori VSA per ciascun ticker.
            </p>
          </div>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-lg" id="empty-results-box">
          <AlertTriangle size={24} className="mx-auto text-slate-500 mb-2" />
          <h3 className="text-slate-300 font-semibold text-sm">Nessun segnale corrispondente</h3>
          <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
            {search || signalFilter !== "ALL"
              ? "Nessun titolo soddisfa le condizioni di ricerca o filtri attivi. Prova a modificare i filtri o inserire termini diversi."
              : "La lista ticker è vuota o la scansione non è stata ancora avviata."}
          </p>
          <button
            onClick={onTriggerScan}
            className="mt-4 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 rounded-xl text-xs font-semibold border border-indigo-500/30 transition-all shadow"
            id="btn-empty-scan-trigger"
          >
            Avvia una scansione ad ampio spettro
          </button>
        </div>
      ) : (
        <>
          {/* MOBILE VIEW (CARDS COMPATTE ED ESPANDIBILI) - SPECIFICO SMARTPHONE */}
          <div className="block md:hidden space-y-3" id="mobile-cards-list">
            {filteredResults.map((row) => {
              const isBuy = row.SEGNALE_OPERATIVO === "POTENZIALE BUY";
              const isSell = row.SEGNALE_OPERATIVO === "POTENZIALE SELL";
              
              return (
                <div
                  key={row.Raw_Ticker}
                  onClick={() => onSelectTicker(row.Raw_Ticker)}
                  className={`bg-slate-900 rounded-r-xl p-4 border-l-4 border-y border-r border-y-slate-800/60 border-r-slate-800/60 transition-all cursor-pointer shadow-lg hover:shadow-xl active:scale-[0.98] ${
                    isBuy
                      ? "border-l-emerald-500 hover:border-r-emerald-500/20 hover:border-y-emerald-500/10"
                      : isSell
                      ? "border-l-rose-500 hover:border-r-rose-500/20 hover:border-y-rose-500/10"
                      : "border-l-slate-600 hover:border-r-slate-500/20"
                  }`}
                  id={`mobile-card-${row.Ticker}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-base text-slate-100 tracking-wide">
                        {row.Ticker}
                      </span>
                      {row.Raw_Ticker.includes(".MI") && (
                        <span className="text-[9px] bg-slate-950 border border-slate-800 text-slate-400 px-1 py-0.5 rounded font-mono">
                          MTA
                        </span>
                      )}
                    </div>
                    {/* Operating signal badge */}
                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${getSignalBadgeStyle(row.SEGNALE_OPERATIVO)}`}>
                      {row.SEGNALE_OPERATIVO}
                    </div>
                  </div>

                  {/* Indicators line */}
                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800/50 mt-1 mb-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Prezzo</span>
                      <span className="font-mono font-semibold text-slate-200">
                        {row.Prezzo_eur.toFixed(2)} €
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Vol vs 20gg</span>
                      <span>{formatVolume(row.Vol_vs_Media_20gg)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Stop Loss</span>
                      <span className="font-mono font-medium text-slate-300">
                        {row.Stop_Loss_Teorico === "-" ? "N/D" : row.Stop_Loss_Teorico.replace(" euro", "")}
                      </span>
                    </div>
                  </div>

                  {/* Summary row */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Stato:</span>
                      <span className={`${getStatusStyle(row.Stato_Wyckoff)}`}>
                        {row.Stato_Wyckoff}
                      </span>
                    </div>
                    
                    <div className="text-indigo-400 hover:text-indigo-300 font-medium text-[11px] flex items-center gap-0.5">
                      <span>Vedi Grafico</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP VIEW (TABELLA CLASSICA ELEGANTE PER INTERFACCE PRO) */}
          <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl" id="desktop-table-container">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60">
                    <th className="px-3.5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Ticker</th>
                    <th className="px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right whitespace-nowrap">Prezzo</th>
                    <th className="px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right whitespace-nowrap font-sans">Vol vs Media (20g)</th>
                    <th className="px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Stato Wyckoff / VSA</th>
                    <th className="px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Segnale</th>
                    <th className="px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Stop Loss</th>
                    <th className="px-3.5 py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredResults.map((row, index) => {
                    const isBuy = row.SEGNALE_OPERATIVO === "POTENZIALE BUY";
                    const isSell = row.SEGNALE_OPERATIVO === "POTENZIALE SELL";
                    
                    return (
                      <tr
                        key={row.Raw_Ticker}
                        className={`hover:bg-slate-850/40 transition-colors ${
                          index % 2 === 0 ? "bg-transparent" : "bg-slate-900/40"
                        }`}
                        id={`desktop-tr-${row.Ticker}`}
                      >
                        <td className={`px-3.5 py-3 border-l-4 whitespace-nowrap  ${
                          isBuy ? "border-l-emerald-500" : isSell ? "border-l-rose-500" : "border-l-slate-600"
                        }`}>
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="font-mono font-bold text-slate-100 tracking-wide">
                              {row.Ticker}
                            </span>
                            {row.Raw_Ticker.includes(".MI") && (
                              <span className="text-[9px] bg-slate-950 border border-slate-800 text-indigo-400 px-1 py-0.5 rounded font-mono">
                                MI
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-semibold text-slate-200 whitespace-nowrap">
                          {row.Prezzo_eur.toFixed(2)} EUR
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          {formatVolume(row.Vol_vs_Media_20gg)}
                        </td>
                        <td className="px-3 py-3 text-xs whitespace-nowrap">
                          <div className={`flex items-center gap-1 whitespace-nowrap ${getStatusStyle(row.Stato_Wyckoff)}`}>
                            {isBuy && <TrendingUp size={13} className="text-emerald-400 opacity-90" />}
                            {isSell && <TrendingDown size={13} className="text-rose-400 opacity-90" />}
                            <span>{row.Stato_Wyckoff}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider whitespace-nowrap ${getSignalBadgeStyle(row.SEGNALE_OPERATIVO)}`}>
                            {row.SEGNALE_OPERATIVO}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-slate-300 whitespace-nowrap">
                          {row.Stop_Loss_Teorico === "-" ? "-" : `${row.Stop_Loss_Teorico.replace(" euro", "")} €`}
                        </td>
                        <td className="px-3.5 py-3 text-center whitespace-nowrap">
                          <button
                            onClick={() => onSelectTicker(row.Raw_Ticker)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg text-xs font-semibold transition-all border border-indigo-500/20 shadow-md whitespace-nowrap cursor-pointer"
                            id={`btn-desktop-chart-${row.Ticker}`}
                          >
                            <ChevronRight size={13} />
                            <span>Grafico</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
