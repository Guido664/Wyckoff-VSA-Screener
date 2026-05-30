import { useState, useMemo } from "react";
import { X, TrendingUp, TrendingDown, Info, BarChart3 } from "lucide-react";
import { TickerHistoryBar } from "../types";

interface StockChartModalProps {
  ticker: string;
  history: TickerHistoryBar[];
  onClose: () => void;
  isLoading: boolean;
}

export default function StockChartModal({ ticker, history, onClose, isLoading }: StockChartModalProps) {
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);

  // Consideriamo gli ultimi 35 giorni per rendere il grafico visivamente comodo e leggibile anche su smartphone!
  const activeBars = useMemo(() => {
    return history.slice(-35);
  }, [history]);

  // Seleziona di default l'ultima barra per mostrare i dati all'avvio
  useMemo(() => {
    if (activeBars.length > 0) {
      setSelectedBarIndex(activeBars.length - 1);
    }
  }, [activeBars]);

  // Calcoli dei limiti e delle proporzioni per il disegno di SVG
  const chartMetrics = useMemo(() => {
    if (activeBars.length === 0) return null;

    let maxPrice = -Infinity;
    let minPrice = Infinity;
    let maxVolume = -Infinity;

    activeBars.forEach((b) => {
      if (b.high > maxPrice) maxPrice = b.high;
      if (b.low < minPrice) minPrice = b.low;
      if (b.volume > maxVolume) maxVolume = b.volume;
      if (b.volumeSma20 > maxVolume) maxVolume = b.volumeSma20;
    });

    // Aggiungiamo un padding del 5% sopra e sotto per non schiacciare le candele ai bordi superiori e inferiori
    const priceDiff = maxPrice - minPrice || 1;
    maxPrice = maxPrice + priceDiff * 0.05;
    minPrice = Math.max(0, minPrice - priceDiff * 0.05);

    return { maxPrice, minPrice, maxVolume };
  }, [activeBars]);

  const activeBar = selectedBarIndex !== null ? activeBars[selectedBarIndex] : null;

  // Coordinate canvas SVG fisso ma scalato via CSS
  const svgWidth = 600;
  const svgHeight = 340;
  const priceHeight = 220; // Altezze per il grafico prezzi
  const volumeHeight = 70; // Altezze per il grafico volumi
  const paddingX = 40;
  const paddingBottom = 40; // Spazio per le etichette date

  // Funzioni ausiliarie per mappare i valori in coordinate pixel X e Y dell'SVG
  const getX = (index: number) => {
    const numBars = activeBars.length;
    const availableWidth = svgWidth - paddingX - 25;
    return paddingX + (index * availableWidth) / (numBars - 1 || 1);
  };

  const getPriceY = (price: number) => {
    if (!chartMetrics) return 0;
    const { maxPrice, minPrice } = chartMetrics;
    const ratio = (price - minPrice) / (maxPrice - minPrice);
    return priceHeight - ratio * (priceHeight - 15);
  };

  const getVolumeY = (vol: number) => {
    if (!chartMetrics) return 0;
    const { maxVolume } = chartMetrics;
    const ratio = vol / (maxVolume || 1);
    const volumeBoxTop = priceHeight + 15;
    return svgHeight - paddingBottom - ratio * (volumeHeight - 5);
  };

  // Creazione dei vettori per la linea SMA50 e SMA20 dei volumi
  const sma50Points = useMemo(() => {
    if (activeBars.length === 0) return "";
    return activeBars
      .map((bar, i) => {
        if (!bar.sma50) return null;
        const x = getX(i);
        const y = getPriceY(bar.sma50);
        return `${x},${y}`;
      })
      .filter((p) => p !== null)
      .join(" ");
  }, [activeBars, chartMetrics]);

  const volSma20Points = useMemo(() => {
    if (activeBars.length === 0) return "";
    return activeBars
      .map((bar, i) => {
        if (!bar.volumeSma20) return null;
        const x = getX(i);
        const y = getVolumeY(bar.volumeSma20);
        return `${x},${y}`;
      })
      .filter((p) => p !== null)
      .join(" ");
  }, [activeBars, chartMetrics]);

  // Calcola se c'è un'anomalia nell'ultima barra visualizzabile
  const latestAnomalies = useMemo(() => {
    if (activeBars.length === 0) return null;
    const current = activeBars[activeBars.length - 1];
    const isHighVolume = current.volume > (1.5 * current.volumeSma20);
    const candleRange = current.high - current.low;
    const isNarrowSpread = idxToSpread(activeBars.length - 1) < (0.8 * idxToSpreadSma(activeBars.length - 1));
    const closePos = candleRange === 0 ? 0.5 : (current.close - current.low) / candleRange;
    
    return {
      isHighVolume,
      isNarrowSpread,
      closePos,
    };

    function idxToSpread(i: number) {
      return Math.abs(activeBars[i].high - activeBars[i].low);
    }
    function idxToSpreadSma(idx: number) {
      if (history.length < 20) return idxToSpread(idx);
      // cerchiamo l'indice in history corrispondente alla data corrente
      const matchHistoryIdx = history.findIndex(h => h.timestamp === activeBars[idx].timestamp);
      if (matchHistoryIdx <= 19) return idxToSpread(idx);
      let sum = 0;
      for (let k = matchHistoryIdx - 19; k <= matchHistoryIdx; k++) {
        sum += Math.abs(history[k].high - history[k].low);
      }
      return sum / 20;
    }
  }, [activeBars, history]);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in" id="stock-chart-modal-root">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[96vh] overflow-y-auto shadow-2xl flex flex-col text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <BarChart3 className="text-indigo-400" size={18} />
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5 font-mono">
                {ticker.replace(".MI", "")} 
                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-sans tracking-normal font-normal">
                  Grafico Wyckoff/VSA a 35 Candele
                </span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 px-1.5 text-slate-400 hover:text-white hover:bg-slate-850 rounded-lg transition-colors border border-slate-800"
            id="btn-close-chart-modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal content body */}
        <div className="p-5 flex-1 space-y-4">
          
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-3" id="chart-loader">
              <div className="w-8 h-8 border-4 border-slate-800 border-t-indigo-500 rounded-full animate-spin"></div>
              <p className="text-slate-400 text-xs">Caricamento grafico quantitativo...</p>
            </div>
          ) : activeBars.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
              Storico non disponibile per questo simbolo.
            </div>
          ) : (
            <>
              {/* Info Panel dell'elemento selezionato sotto puntatore o ultima barra */}
              {activeBar && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 grid grid-cols-2 xs:grid-cols-3 gap-y-2.5 gap-x-4 text-xs font-mono" id="chart-selected-info-panel">
                  <div className="col-span-2 xs:col-span-3 border-b border-slate-900 pb-1.5 flex items-center justify-between text-slate-400 font-sans">
                    <span className="font-semibold text-white">Dati Candela</span>
                    <span>Data: {activeBar.dateStr}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[9px]">Apertura</span>
                    <span className="text-slate-200">{activeBar.open.toFixed(2)} €</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[9px]">Chiusura</span>
                    <span className="text-indigo-300 font-bold">{activeBar.close.toFixed(2)} €</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[9px]">Minimo</span>
                    <span className="text-rose-400">{activeBar.low.toFixed(2)} €</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[9px]">Massimo</span>
                    <span className="text-emerald-400">{activeBar.high.toFixed(2)} €</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[9px]">Volume</span>
                    <span className="text-slate-300">{activeBar.volume.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[9px]">Media V-20gg</span>
                    <span className="text-slate-400">{activeBar.volumeSma20.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* GRAFICO CUSTOM SVG */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 overflow-hidden relative">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-auto text-slate-800"
                  id="wyckoff-custom-svg-canvas"
                >
                  {/* Griglia Orizzontale background */}
                  {[0.25, 0.5, 0.75].map((percent, idx) => {
                    const priceY = getPriceY(
                      (chartMetrics?.minPrice || 0) +
                        percent * ((chartMetrics?.maxPrice || 0) - (chartMetrics?.minPrice || 0))
                    );
                    return (
                      <line
                        key={idx}
                        x1={paddingX}
                        y1={priceY}
                        x2={svgWidth - 20}
                        y2={priceY}
                        stroke="#1e293b"
                        strokeDasharray="4 4"
                        strokeWidth={0.8}
                      />
                    );
                  })}

                  {/* Asse prezzi e volumi */}
                  {chartMetrics && (
                    <>
                      <text x={10} y={15 + 5} fill="#64748b" className="text-[10px] font-mono leading-none">
                        {chartMetrics.maxPrice.toFixed(1)}
                      </text>
                      <text x={10} y={priceHeight - 5} fill="#64748b" className="text-[10px] font-mono leading-none">
                        {chartMetrics.minPrice.toFixed(1)}
                      </text>
                      <text x={10} y={priceHeight + 15 + 10} fill="#64748b" className="text-[10px] font-mono leading-none">
                        VOL
                      </text>
                    </>
                  )}

                  {/* Linea SMA 50 (Gialla/Aurea) */}
                  {sma50Points && (
                    <polyline
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth={1.8}
                      points={sma50Points}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Linea Volume SMA 20 (Blu/Indaco) */}
                  {volSma20Points && (
                    <polyline
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth={1.2}
                      points={volSma20Points}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="3 3"
                    />
                  )}

                  {/* Disegno Candele e Colonne Volumi */}
                  {activeBars.map((bar, i) => {
                    const x = getX(i);
                    const openY = getPriceY(bar.open);
                    const closeY = getPriceY(bar.close);
                    const highY = getPriceY(bar.high);
                    const lowY = getPriceY(bar.low);
                    const volumeY = getVolumeY(bar.volume);

                    const isGreen = bar.close >= bar.open;
                    const strokeColor = isGreen ? "#10b981" : "#f43f5e";
                    const fillColor = isGreen ? "#10b981" : "#f43f5e";

                    // Calcola larghezza dinamica candele basata sullo spazio disponibile
                    const candleWidth = Math.max(4, Math.floor(400 / activeBars.length));

                    return (
                      <g
                        key={i}
                        className="cursor-pointer group"
                        onClick={() => setSelectedBarIndex(i)}
                      >
                        {/* Area sensibile al tocco trasparente (per navigazione del grafico facilitata) */}
                        <rect
                          x={x - candleWidth * 1.5}
                          y={5}
                          width={candleWidth * 3}
                          height={svgHeight - paddingBottom}
                          fill="transparent"
                        />

                        {/* Linea Verticale (Wick/Ombra) */}
                        <line
                          x1={x}
                          y1={highY}
                          x2={x}
                          y2={lowY}
                          stroke={strokeColor}
                          strokeWidth={1.3}
                        />

                        {/* Corpo Candela (Real Body) */}
                        <rect
                          x={x - candleWidth / 2}
                          y={Math.min(openY, closeY)}
                          width={candleWidth}
                          height={Math.max(2, Math.abs(openY - closeY))}
                          fill={fillColor}
                          stroke={strokeColor}
                          strokeWidth={0.5}
                          rx={1}
                        />

                        {/* Rettangolo Volume */}
                        <rect
                          x={x - candleWidth / 2}
                          y={volumeY}
                          width={candleWidth}
                          height={Math.max(1, svgHeight - paddingBottom - volumeY)}
                          fill={isGreen ? "#10b98140" : "#f43f5e40"}
                          stroke={isGreen ? "#10b98160" : "#f43f5e60"}
                          strokeWidth={0.5}
                        />

                        {/* Indicatore Barra Selezionata */}
                        {selectedBarIndex === i && (
                          <line
                            x1={x}
                            y1={10}
                            x2={x}
                            y2={svgHeight - paddingBottom + 5}
                            stroke="#ffffff"
                            strokeWidth={0.8}
                            strokeDasharray="2 2"
                            opacity={0.6}
                          />
                        )}
                      </g>
                    );
                  })}

                  {/* Disegno Date sull'asse X */}
                  {activeBars.map((bar, i) => {
                    // Disegna la data ogni 7 candele per evitare scritte sovrapposte su telefono
                    if (i % 7 !== 0) return null;
                    const x = getX(i);
                    return (
                      <g key={`date-${i}`}>
                        <line
                          x1={x}
                          y1={svgHeight - paddingBottom}
                          x2={x}
                          y2={svgHeight - paddingBottom + 4}
                          stroke="#334155"
                          strokeWidth={1}
                        />
                        <text
                          x={x}
                          y={svgHeight - paddingBottom + 16}
                          fill="#475569"
                          textAnchor="middle"
                          className="text-[9px] font-mono"
                        >
                          {bar.dateStr}
                        </text>
                      </g>
                    );
                  })}

                  {/* Linea base asse delle date */}
                  <line
                    x1={paddingX}
                    y1={svgHeight - paddingBottom}
                    x2={svgWidth - 20}
                    y2={svgHeight - paddingBottom}
                    stroke="#1e293b"
                    strokeWidth={1}
                  />
                </svg>

                {/* Grafico Legenda */}
                <div className="absolute top-2 right-2 flex flex-col gap-1 z-10 p-1.5 opacity-90 text-[9px] text-slate-400 font-mono">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-0.5 bg-[#f59e0b] inline-block"></span>
                    <span>SMA 50 Close</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-0.5 border-t border-dashed border-[#6366f1] inline-block"></span>
                    <span>SMA 20 Volume</span>
                  </div>
                </div>
              </div>

              {/* Legenda sul tocco utente */}
              <p className="text-[10px] text-slate-500 text-center font-sans">
                💡 Suggerimento: Tocca o passa il mouse su qualsiasi candela per visualizzare i dettagli storici nel pannello in alto.
              </p>

              {/* Wyckoff/VSA Diagnostica Anomalie */}
              {latestAnomalies && (
                <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
                  <h4 className="font-semibold text-slate-300 text-xs flex items-center gap-1.5 font-sans">
                    <Info size={14} className="text-indigo-400" />
                    Diagnostica VSA dell'ultima sessione
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-slate-400 font-mono text-[11px] pt-1">
                    <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-850">
                      <span>Anomalia Volume:</span>
                      <span className={`font-bold ${latestAnomalies.isHighVolume ? "text-emerald-400" : "text-slate-500"}`}>
                        {latestAnomalies.isHighVolume ? "ALTO SFORZO" : "NORMALE"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-850">
                      <span>Rapporto Spread:</span>
                      <span className={`font-bold ${latestAnomalies.isNarrowSpread ? "text-indigo-400" : "text-slate-500"}`}>
                        {latestAnomalies.isNarrowSpread ? "STRETTO/COMPRESSO" : "AMPIO"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-850 col-span-2">
                      <span>Focus Chiusura (Range Candela):</span>
                      <span className="text-white font-bold">
                        {(latestAnomalies.closePos * 100).toFixed(0)}% del range 
                        <span className="text-slate-500 font-normal ml-1">
                          ({latestAnomalies.closePos > 0.5 ? "Chiusura in Alto" : "Chiusura in Basso"})
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-801 bg-slate-950/40 text-center text-[10px] text-slate-500 font-sans flex items-center justify-between">
          <span>Wyckoff Decisions Screener PRO</span>
          <span className="font-mono">Fuso orario: UTC</span>
        </div>

      </div>
    </div>
  );
}
