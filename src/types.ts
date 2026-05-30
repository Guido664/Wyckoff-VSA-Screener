export interface AnalysisResult {
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

export interface TickerHistoryBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  dateStr: string;
  sma50: number;
  volumeSma20: number;
}
