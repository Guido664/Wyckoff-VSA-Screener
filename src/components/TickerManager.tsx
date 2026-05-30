import React, { useState } from "react";
import { Plus, X, RotateCcw, HelpCircle } from "lucide-react";

interface TickerManagerProps {
  tickers: string[];
  onTickersChange: (newTickers: string[]) => void;
  onReset: () => void;
}

export default function TickerManager({ tickers, onTickersChange, onReset }: TickerManagerProps) {
  const [newTicker, setNewTicker] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleAddTicker = (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = newTicker.trim().toUpperCase();
    
    if (!formatted) return;

    // Semplici validazioni per assicurarsi che l'utente inserisca formati Yahoo validi
    if (formatted.length < 2) {
      setError("Il simbolo inserito è troppo corto.");
      return;
    }

    if (tickers.includes(formatted)) {
      setError("Questo ticker è già presente nel paniere.");
      return;
    }

    // Assicura l'aggiunta di suffissi corretti per mercato italiano se l'utente digita solo il nome (es. ENI -> ENI.MI)
    let processedTicker = formatted;
    // Se non ha estensioni (cioè non contiene punti es. RACE, UCG) e l'utente inserisce simboli tipici italiani,
    // o se desidera aggiungerlo di default con .MI, possiamo farlo. Ma è meglio suggerire all'utente di inserire il simbolo esatto della borsa,
    // es. .MI per Milano, .DE per Francoforte, o nessun suffisso per USA.
    // Facciamolo dinamico: se l'utente inserisce ad es. "ENI", possiamo suggerire ".MI" o inserirlo facoltativamente,
    // ma lasciamo la scelta flessibile. Se scrivono 3 o 4 lettere, aggiungiamo .MI se non c'è punto per facilità d'uso del mercato Borsa Italiana!
    if (!processedTicker.includes(".") && !["US", "NASDAQ", "NYSE", "BTC", "USD"].some(ex => processedTicker.includes(ex))) {
      processedTicker = `${processedTicker}.MI`;
    }

    if (tickers.includes(processedTicker)) {
      setError("Questo ticker è già presente.");
      return;
    }

    const updated = [...tickers, processedTicker];
    onTickersChange(updated);
    setNewTicker("");
    setError(null);
  };

  const handleRemoveTicker = (tickerToRemove: string) => {
    const updated = tickers.filter(t => t !== tickerToRemove);
    onTickersChange(updated);
    setError(null);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xs font-semibold tracking-wide text-indigo-400 uppercase">
            Paniere Titoli Attivo
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Gestisci la lista dei ticker per la scansione quantitativa.
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="p-1.5 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Spiegazione Regole Wyckoff"
            id="btn-wyckoff-info"
          >
            <HelpCircle size={15} />
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-1 px-2 py-1.5 border border-red-950 text-red-400 bg-red-950/20 hover:bg-red-950/40 hover:text-red-300 rounded-lg text-[10px] font-medium transition-colors"
            title="Ripristina valori di fabbrica"
            id="btn-restore-default"
          >
            <RotateCcw size={11} />
            <span>Ripristina</span>
          </button>
        </div>
      </div>

      {showExplanation && (
        <div id="wyckoff-rules-explanation" className="mb-3 p-3 rounded-lg bg-indigo-950/30 border border-indigo-900/40 text-[11px] text-slate-300 leading-relaxed text-left">
          <h3 className="font-semibold text-indigo-300 text-xs mb-1.5">Metodo Wyckoff & VSA (Sintesi Metodologica):</h3>
          <p className="mb-1.5">
            La <strong>Volume Spread Analysis (VSA)</strong> studia la relazione tra lo <strong>Sforzo (Volume)</strong>, il <strong>Risultato (Chiusura in Candela)</strong> e la <strong>Distanza (Spread Alta-Bassa)</strong>.
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              <span className="text-emerald-400 font-semibold">BUY Caso A</span>: Volume superiore del 50% alla media a 20g con Spread stretto e Chiusura nella metà superiore.
            </li>
            <li>
              <span className="text-emerald-400 font-semibold">BUY Caso B (Spring)</span>: Falsa rottura del minimo a 20 giorni seguita da rapido recupero.
            </li>
            <li>
              <span className="text-rose-400 font-semibold">SELL Caso A</span>: Volume elevato ma spread stretto con chiusura nella parte inferiore in trend rialzista.
            </li>
            <li>
              <span className="text-rose-400 font-semibold">SELL Caso B (Upthrust)</span>: Falsa rottura del massimo a 20 giorni seguita da rientro.
            </li>
          </ul>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleAddTicker} className="flex gap-2 mb-3" id="form-add-ticker">
        <div className="relative flex-1">
          <input
            type="text"
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-600 font-mono tracking-wider uppercase transition-all"
            placeholder="Es: UCG.MI, RACE.MI"
            value={newTicker}
            onChange={(e) => {
              setNewTicker(e.target.value);
              if (error) setError(null);
            }}
            id="input-ticker-value"
          />
        </div>
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-3 py-2 font-semibold text-xs flex items-center gap-1 transition-all shadow-lg active:scale-95"
          id="btn-add-ticker"
        >
          <Plus size={14} />
          <span>Aggiungi</span>
        </button>
      </form>

      {error && (
        <div className="mb-2 text-[11px] text-red-400 font-medium" id="error-ticker-mgmt">
          {error}
        </div>
      )}

      {/* Badges Box */}
      <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1 select-none scrollbar-thin scrollbar-thumb-slate-800">
        {tickers.map((ticker) => {
          const cleanName = ticker.replace(".MI", "");
          const isMilano = ticker.includes(".MI");
          
          return (
            <div
              key={ticker}
              className="flex items-center gap-1 bg-slate-950 text-slate-300 border border-slate-800 rounded-full pl-2.5 pr-1 py-1 text-xs font-mono transition-all duration-150 hover:bg-slate-800"
              id={`badge-${ticker.replace(".", "_")}`}
            >
              <div className="flex items-center gap-1">
                <span className="font-semibold text-slate-100">{cleanName}</span>
                {isMilano && (
                  <span className="text-[9px] text-indigo-500 bg-indigo-950 px-1 rounded-sm font-sans">MI</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemoveTicker(ticker)}
                className="p-1 text-slate-500 hover:text-red-400 transition-colors rounded-full hover:bg-slate-900"
                id={`btn-remove-${ticker.replace(".", "_")}`}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
        {tickers.length === 0 && (
          <div className="text-center w-full py-4 text-xs italic text-slate-500">
            Nessun ticker nel paniere. Aggiungine uno sopra!
          </div>
        )}
      </div>
      
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-800/60 text-[10px] text-slate-500 font-mono">
        <div>Totale titoli: {tickers.length}</div>
        <div>Salvataggio automatico locale</div>
      </div>
    </div>
  );
}
