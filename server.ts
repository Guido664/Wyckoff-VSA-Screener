import express from "express";
import path from "path";

// Tipi utili per l'analisi quantitativa
interface TickerHistoryBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  dateStr: string;
}

interface AnalysisResult {
  Ticker: string;
  Raw_Ticker: string;
  Prezzo_eur: number;
  Vol_vs_Media_20gg: string;
  Stato_Wyckoff: string;
  SEGNALE_OPERATIVO: string;
  Stop_Loss_Teorico: string;
  Raw_Volume_Ratio: number;
  Close_Position: number;
  Trend_Direction: "UP" | "DOWN" | "NEUTRAL";
  Last_Volume: number;
  Avg_Volume_20: number;
  High_Volume_Anomaly: boolean;
  Narrow_Spread: boolean;
}

// Generatore di dati simulati di emergenza e di backup se Yahoo Finance va in errore o ritorna 429
function generateFallbackScreenerData(tickers: string[]): AnalysisResult[] {
  console.log("[CORE] Generazione dati simulati realistici per Wyckoff/VSA screener");
  
  // Utilizziamo un hash coerente generato dal nome del ticker per garantire risultati stabili nel tempo
  const getHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  };

  return tickers.map((t) => {
    const hash = getHash(t);
    // Base prices based on ticker
    let basePrice = 10 + (hash % 150);
    
    // Generiamo metriche simulate realistiche
    const volumeRatio = -0.4 + ((hash % 100) / 10) * 0.2; // da -40% a +160%
    const currentVolume = Math.round(500000 + (hash % 50) * 100000);
    const avgVolume20 = Math.round(currentVolume / (1 + volumeRatio));
    
    let status = "Struttura Neutra";
    let signal = "HOLD / NEUTRO";
    let stopLoss = "-";
    let trend: "UP" | "DOWN" | "NEUTRAL" = (hash % 3 === 0) ? "DOWN" : (hash % 3 === 1) ? "UP" : "NEUTRAL";

    const isHighVolume = volumeRatio > 0.5; // > +50%
    const isNarrowSpread = hash % 2 === 0;
    const closePosition = 0.1 + ((hash % 8) / 8) * 0.8; // 0.1 a 0.9

    if (trend === "DOWN") {
      // Caso A accumulazione
      if (isHighVolume && isNarrowSpread && closePosition > 0.5) {
        status = "(Accumulazione)";
        signal = "POTENZIALE BUY";
        stopLoss = `${(basePrice * 0.99).toFixed(2)} euro`;
      } else if (hash % 5 === 0) {
        // Caso B Spring
        status = "Setup Spring Rilevato";
        signal = "POTENZIALE BUY";
        stopLoss = `${(basePrice * 0.98).toFixed(2)} euro`;
      }
    } else if (trend === "UP") {
      // Caso A distribuzione
      if (isHighVolume && isNarrowSpread && closePosition < 0.5) {
        status = "(Distribuzione)";
        signal = "POTENZIALE SELL";
        stopLoss = `${(basePrice * 1.01).toFixed(2)} euro`;
      } else if (hash % 5 === 1) {
        // Caso B Upthrust
        status = "Setup Upthrust Rilevato";
        signal = "POTENZIALE SELL";
        stopLoss = `${(basePrice * 1.02).toFixed(2)} euro`;
      }
    }

    return {
      Ticker: t.toUpperCase().replace(".MI", ""),
      Raw_Ticker: t,
      Prezzo_eur: Math.round(basePrice * 100) / 100,
      Vol_vs_Media_20gg: `${volumeRatio >= 0 ? "+" : ""}${(volumeRatio * 100).toFixed(1)}%`,
      Stato_Wyckoff: status,
      SEGNALE_OPERATIVO: signal,
      Stop_Loss_Teorico: stopLoss,
      Raw_Volume_Ratio: volumeRatio,
      Close_Position: closePosition,
      Trend_Direction: trend,
      Last_Volume: currentVolume,
      Avg_Volume_20: avgVolume20,
      High_Volume_Anomaly: isHighVolume,
      Narrow_Spread: isNarrowSpread
    };
  });
}

function generateFallbackHistoryData(ticker: string, numDays = 60): TickerHistoryBar[] {
  const getHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  };

  const hash = getHash(ticker);
  let currentPrice = 10 + (hash % 150);
  const data: TickerHistoryBar[] = [];
  
  const today = new Date();
  for (let i = numDays - 1; i >= 0; i--) {
    const barDate = new Date(today);
    barDate.setDate(today.getDate() - i);
    // Skip weekends
    if (barDate.getDay() === 0 || barDate.getDay() === 6) {
      continue;
    }
    
    // Random walk
    const changePercent = -0.015 + Math.random() * 0.03;
    const open = currentPrice;
    const close = currentPrice * (1 + changePercent);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    
    // Volume generator (make some days have ultra high volume)
    let volume = Math.round(300000 + Math.random() * 1200000);
    if (i === 10 || i === 25 || i === 4) {
      volume = Math.round(volume * 2.8); // anomalie volumetriche
    }

    data.push({
      timestamp: Math.floor(barDate.getTime() / 1000),
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
      dateStr: barDate.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })
    });
    
    currentPrice = close;
  }
  return data;
}

// Analizzatore di asset quantitativo fedele alla logica Python
function analyzeAssetData(ticker: string, bars: TickerHistoryBar[]): AnalysisResult | null {
  const N = bars.length;
  if (N < 50) {
    console.warn(`[ANALYZE] ${ticker} ha troppi pochi dati storici: ${N} (richiesti al minimo 50)`);
    return null;
  }

  // 1. Calcolo metriche di base
  // Volume SMA 20
  const volumeSma20 = new Array(N).fill(0);
  for (let i = 19; i < N; i++) {
    let sum = 0;
    for (let j = i - 19; j <= i; j++) {
      sum += bars[j].volume;
    }
    volumeSma20[i] = sum / 20;
  }

  // Spreads e Spread SMA 20
  const spreads = bars.map(b => Math.abs(b.high - b.low));
  const spreadSma20 = new Array(N).fill(0);
  for (let i = 19; i < N; i++) {
    let sum = 0;
    for (let j = i - 19; j <= i; j++) {
      sum += spreads[j];
    }
    spreadSma20[i] = sum / 20;
  }

  // SMA 50 delle Chiusure
  const sma50 = new Array(N).fill(0);
  for (let i = 49; i < N; i++) {
    let sum = 0;
    for (let j = i - 49; j <= i; j++) {
      sum += bars[j].close;
    }
    sma50[i] = sum / 50;
  }

  // Dati ultima candela (Oggi/Chiusura recente)
  const current = bars[N - 1];
  const previous = bars[N - 2];

  // Minimi e massimi storici recenti dei 20 giorni esclusa l'ultima candela
  // Python: low_20 = df['Low'].iloc[-21:-1].min()
  let low_20 = Infinity;
  let high_20 = -Infinity;
  for (let i = N - 21; i <= N - 2; i++) {
    if (bars[i].low < low_20) low_20 = bars[i].low;
    if (bars[i].high > high_20) high_20 = bars[i].high;
  }

  const closePrice = current.close;
  const currentVolumeSma = volumeSma20[N - 1];
  const volumeRatio = currentVolumeSma > 0 ? (current.volume / currentVolumeSma) - 1 : 0;
  
  const candlestickRange = current.high - current.low;
  const closePosition = candlestickRange === 0 ? 0.5 : (current.close - current.low) / candlestickRange;

  // Inizializzazione status segnale
  let status = "Struttura Neutra";
  let signal = "HOLD / NEUTRO";
  let stopLoss = "-";

  // --- CONFIGURAZIONE 1: POTENZIALE BUY (Accumulazione / Spring) ---
  const isTrendDown = closePrice < sma50[N - 1];
  const highVolume = current.volume > (1.5 * currentVolumeSma);
  const narrowSpread = spreads[N - 1] < (0.8 * spreadSma20[N - 1]);

  if (isTrendDown) {
    // Caso A: Sforzo senza risultato in accumulazione
    if (highVolume && narrowSpread && closePosition > 0.5) {
      status = "(Accumulazione)";
      signal = "POTENZIALE BUY";
      stopLoss = `${(current.low * 0.99).toFixed(2)} euro`;
    }
    // Caso B: Setup Spring (Rottura falsa del minimo e rientro)
    else if (previous.low < low_20 && current.close > low_20) {
      status = "Setup Spring Rilevato";
      signal = "POTENZIALE BUY";
      stopLoss = `${(previous.low * 0.99).toFixed(2)} euro`;
    }
  }

  // --- CONFIGURAZIONE 2: POTENZIALE SELL (Distribuzione / Upthrust) ---
  const isTrendUp = closePrice > sma50[N - 1];

  if (isTrendUp) {
    // Caso A: Sforzo senza risultato in distribuzione
    if (highVolume && narrowSpread && closePosition < 0.5) {
      status = "(Distribuzione)";
      signal = "POTENZIALE SELL";
      stopLoss = `${(current.high * 1.01).toFixed(2)} euro`;
    }
    // Caso B: Setup Upthrust (Rottura falsa del massimo e rientro)
    else if (previous.high > high_20 && current.close < high_20) {
      status = "Setup Upthrust Rilevato";
      signal = "POTENZIALE SELL";
      stopLoss = `${(previous.high * 1.01).toFixed(2)} euro`;
    }
  }

  return {
    Ticker: ticker.toUpperCase().replace(".MI", ""),
    Raw_Ticker: ticker,
    Prezzo_eur: Math.round(closePrice * 100) / 100,
    Vol_vs_Media_20gg: `${volumeRatio >= 0 ? "+" : ""}${(volumeRatio * 100).toFixed(1)}%`,
    Stato_Wyckoff: status,
    SEGNALE_OPERATIVO: signal,
    Stop_Loss_Teorico: stopLoss,
    Raw_Volume_Ratio: volumeRatio,
    Close_Position: closePosition,
    Trend_Direction: isTrendUp ? "UP" : isTrendDown ? "DOWN" : "NEUTRAL",
    Last_Volume: current.volume,
    Avg_Volume_20: Math.round(currentVolumeSma),
    High_Volume_Anomaly: highVolume,
    Narrow_Spread: narrowSpread
  };
}

// Helper per eseguire fetch con un limite di timeout e prevenire crash su Vercel Serverless
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 1200): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// Funzione principale per scaricare e analizzare i dati storici da Yahoo Finance
async function fetchAndAnalyzeTicker(ticker: string): Promise<AnalysisResult | null> {
  let targetTicker = ticker.trim().toUpperCase();
  
  // Se il ticker inizia con un numero (es. 1GOOGL) e non ha un suffisso di borsa con punto, aggiungiamo .MI
  if (/^[0-9]/.test(targetTicker) && !targetTicker.includes(".")) {
    targetTicker = `${targetTicker}.MI`;
    console.log(`[TICKER NORMALIZER] Ticker normalizzato: da ${ticker} a ${targetTicker}`);
  }

  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(targetTicker)}?range=90d&interval=1d`;
  
  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json"
      }
    }, 1200);

    if (!response.ok) {
      throw new Error(`Inadempienza server Yahoo Finance. Status: ${response.status}`);
    }

    const data: any = await response.json();
    const result = data.chart?.result?.[0];
    if (!result) {
      throw new Error("Formato json vuoto o non conforme da Yahoo Finance");
    }

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const highs = quote.high || [];
    const lows = quote.low || [];
    const closes = quote.close || [];
    const opens = quote.open || [];
    const volumes = quote.volume || [];

    const bars: TickerHistoryBar[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const isOk = 
        timestamps[i] !== null && timestamps[i] !== undefined &&
        highs[i] !== null && highs[i] !== undefined &&
        lows[i] !== null && lows[i] !== undefined &&
        closes[i] !== null && closes[i] !== undefined &&
        opens[i] !== null && opens[i] !== undefined &&
        volumes[i] !== null && volumes[i] !== undefined;

      if (isOk) {
        const barDate = new Date(timestamps[i] * 1000);
        bars.push({
          timestamp: timestamps[i],
          open: parseFloat(opens[i]),
          high: parseFloat(highs[i]),
          low: parseFloat(lows[i]),
          close: parseFloat(closes[i]),
          volume: parseInt(volumes[i]),
          dateStr: barDate.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })
        });
      }
    }

    if (bars.length < 50) {
      console.warn(`[FETCH] ${targetTicker} ha solo ${bars.length} candele filtrate valide.`);
      return null;
    }

    return analyzeAssetData(targetTicker, bars);

  } catch (error: any) {
    console.error(`[ERROR FR] Errore scaricamento dati reali per ${targetTicker} (originale: ${ticker}): ${error.message}`);
    return null;
  }
}

const app = express();
app.use(express.json());

// 1. API: Screener di mercato bicarica tutti i ticker indicati
app.post("/api/screener", async (req, res) => {
    let tickers: string[] = req.body.tickers;
    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({ success: false, error: "Tickers mancanti o malformati." });
    }

    console.log(`[SCREENER] Avvio scansione quantitativa di ${tickers.length} ticker...`);

    try {
      // Eseguiamo i caricamenti in parallelo gestiti in background
      const analysisPromises = tickers.map(ticker => fetchAndAnalyzeTicker(ticker));
      const results = await Promise.all(analysisPromises);
      
      let finalResults = results.filter((r): r is AnalysisResult => r !== null && r !== undefined);
      let isDemoMode = false;

      // Se tutte le chiamate falliscono (es. problemi IP o blocco CORS container), generiamo dati simulati realistici per preservare l'analisi interattiva
      if (finalResults.length === 0) {
        console.warn("[SCREENER] Tutti i ticker reali hanno fallito il download. Attivazione modalità Demo Simulatore.");
        finalResults = generateFallbackScreenerData(tickers);
        isDemoMode = true;
      }

      // Ordinamento Wyckoff: 
      // Prima i Potenziali segnali operativi (BUY/SELL), ordinati internamente per anomalie volumetriche decrescenti,
      // poi i segnali HOLD ordinati per anomalie volumetriche decrescenti.
      const getPriority = (signal: string) => {
        if (signal === "POTENZIALE BUY" || signal === "POTENZIALE SELL") return 0;
        return 1;
      };

      finalResults.sort((a, b) => {
        const priorityA = getPriority(a.SEGNALE_OPERATIVO);
        const priorityB = getPriority(b.SEGNALE_OPERATIVO);
        
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        // Ordinamento per volume anomalo decrescente
        return b.Raw_Volume_Ratio - a.Raw_Volume_Ratio;
      });

      res.json({
        success: true,
        isDemoMode,
        timestamp: new Date().toISOString(),
        count: finalResults.length,
        data: finalResults
      });

    } catch (err: any) {
      console.error("[Screener Error]", err);
      res.status(500).json({ 
        success: false, 
        error: "Errore interno durante lo screening.", 
        details: err?.message || String(err),
        stack: err?.stack
      });
    }
  });

  // 2. API: Storico per un singolo Ticker (per visualizzazione grafici e candele)
  app.get("/api/ticker-history", async (req, res) => {
    const rawTicker = req.query.ticker as string;
    if (!rawTicker) {
      return res.status(400).json({ success: false, error: "Parametro ticker mancante." });
    }

    let ticker = rawTicker.trim().toUpperCase();
    if (/^[0-9]/.test(ticker) && !ticker.includes(".")) {
      ticker = `${ticker}.MI`;
      console.log(`[TICKER NORMALIZER] History normalizzato da ${rawTicker} a ${ticker}`);
    }

    console.log(`[HISTORY] Richiesto storico dettagliato per ${ticker}`);
    
    try {
      const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=90d&interval=1d`;
      const response = await fetchWithTimeout(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json"
        }
      }, 3000);

      if (!response.ok) {
        throw new Error(`Yahoo Finance Service status ${response.status}`);
      }

      const json: any = await response.json();
      const result = json.chart?.result?.[0];
      if (!result) {
        throw new Error("Risposta Yahoo Finance vuota o non valida");
      }

      const timestamps = result.timestamp || [];
      const quote = result.indicators?.quote?.[0] || {};
      const highs = quote.high || [];
      const lows = quote.low || [];
      const closes = quote.close || [];
      const opens = quote.open || [];
      const volumes = quote.volume || [];

      const bars: TickerHistoryBar[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        if (
          timestamps[i] !== null &&
          highs[i] !== null &&
          lows[i] !== null &&
          closes[i] !== null &&
          opens[i] !== null &&
          volumes[i] !== null
        ) {
          const bDate = new Date(timestamps[i] * 1000);
          bars.push({
            timestamp: timestamps[i],
            open: parseFloat(opens[i]),
            high: parseFloat(highs[i]),
            low: parseFloat(lows[i]),
            close: parseFloat(closes[i]),
            volume: parseInt(volumes[i]),
            dateStr: bDate.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })
          });
        }
      }

      if (bars.length < 10) {
        throw new Error("Troppo pochi dati storici reali validi trovati");
      }

      // Calcola i valori SMA storici per visualizzarli nel grafico
      const historyWithIndicators = bars.map((bar, idx) => {
        // SMA 50
        let sma50Value = 0;
        if (idx >= 49) {
          let sum = 0;
          for (let k = idx - 49; k <= idx; k++) sum += bars[k].close;
          sma50Value = sum / 50;
        } else {
          // Fallback progressivo fino a quando non abbiamo 50 elementi
          let sum = 0;
          for (let k = 0; k <= idx; k++) sum += bars[k].close;
          sma50Value = sum / (idx + 1);
        }

        // Volume SMA 20
        let volSma20Value = 0;
        if (idx >= 19) {
          let sum = 0;
          for (let k = idx - 19; k <= idx; k++) sum += bars[k].volume;
          volSma20Value = sum / 20;
        } else {
          let sum = 0;
          for (let k = 0; k <= idx; k++) sum += bars[k].volume;
          volSma20Value = sum / (idx + 1);
        }

        return {
          ...bar,
          sma50: Math.round(sma50Value * 100) / 100,
          volumeSma20: Math.round(volSma20Value)
        };
      });

      res.json({
        success: true,
        isDemoMode: false,
        ticker: ticker.toUpperCase(),
        history: historyWithIndicators
      });

    } catch (err: any) {
      console.warn(`[HISTORY] Impossibile scaricare storico reale per ${ticker}, attivazione Backup Simulato: ${err.message}`);
      
      // Fallback a dati storici simulati realistici calibrati
      const simulatedBars = generateFallbackHistoryData(ticker, 70);
      const historyWithIndicators = simulatedBars.map((bar, idx) => {
        let sma50Value = 0;
        let sum = 0;
        const count50 = Math.min(idx + 1, 50);
        for (let k = idx - count50 + 1; k <= idx; k++) {
          sum += simulatedBars[k].close;
        }
        sma50Value = sum / count50;

        let volSma20Value = 0;
        let volSum = 0;
        const count20 = Math.min(idx + 1, 20);
        for (let k = idx - count20 + 1; k <= idx; k++) {
          volSum += simulatedBars[k].volume;
        }
        volSma20Value = volSum / count20;

        return {
          ...bar,
          sma50: Math.round(sma50Value * 100) / 100,
          volumeSma20: Math.round(volSma20Value)
        };
      });

      res.json({
        success: true,
        isDemoMode: true,
        ticker: ticker.toUpperCase(),
        history: historyWithIndicators
      });
    }
  });

// Solo se non siamo in ambiente Vercel o serverless, vogliamo avviare il server Express e gestire l'hosting statico / dev!
const isVercel = process.env.VERCEL === "1" || !!process.env.VERCEL_ENV;

if (!isVercel) {
  const startLocalServer = async () => {
    // Vite development middleware o server statico per produzione
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[WYCKOFF SERVER] Servizio attivo e in ascolto sulla porta ${PORT}`);
    });
  };

  startLocalServer().catch((err) => {
    console.error("[SERVER COLD-START ERROR]", err);
  });
}

export default app;
