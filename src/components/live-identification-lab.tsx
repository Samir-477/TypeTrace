"use client";

import { useMemo, useRef, useState } from "react";
import { Activity, RotateCcw, ScanSearch } from "lucide-react";
import { inferKeyformer } from "@/lib/keyformer-browser";
import { extractLiveWindow, type CapturedKeyEvent } from "@/lib/live-feature-extraction";
import { summarizeLiveSignal } from "@/lib/live-signal-summary";
import styles from "./live-identification-lab.module.css";

type Prediction = Awaited<ReturnType<typeof inferKeyformer>>;
const number = (value: number, digits = 0) => Number.isFinite(value) ? value.toFixed(digits) : "—";

export function LiveIdentificationLab({ prompt }: { prompt: string }) {
  const [events, setEvents] = useState<CapturedKeyEvent[]>([]);
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [status, setStatus] = useState<"idle"|"loading"|"ready"|"error">("idle");
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const passage = prompt.trim().slice(0, 260);
  const extracted = useMemo(() => extractLiveWindow(events), [events]);
  const signal = useMemo(() => summarizeLiveSignal(events), [events]);

  const capture = (type: "down" | "up", event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (type === "down" && event.repeat) return;
    setEvents((current) => [...current, { key: event.key, code: event.code, type, time: performance.now() }]);
    setPrediction(null);
    setStatus("idle");
  };
  const compare = async () => {
    if (!extracted.ready || !signal.canCompare) return;
    setStatus("loading");
    try {
      setPrediction(await inferKeyformer(extracted.rows, extracted.keyPairs));
      setStatus("ready");
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  };
  const reset = () => { setEvents([]); setText(""); setPrediction(null); setStatus("idle"); input.current?.focus(); };
  const maxRhythm = Math.max(1, ...signal.rhythm.map((item) => Math.min(Math.abs(item), 700)));

  return (
    <div className={`${styles.lab} glass-panel`}>
      <header className={styles.toolbar}>
        <div><span className="mini-label">Live timing capture</span><h3>Type the passage and watch your timing appear.</h3></div>
        <div className={styles.progress}><span>{String(Math.min(signal.completed, 65)).padStart(2, "0")}</span><i><i style={{ width: `${Math.min(100, signal.completed / 65 * 100)}%` }}/></i><b>65</b></div>
      </header>

      <div className={styles.flow}><span className={styles.activeFlow}>TYPE</span><i/><span>MEASURE</span><i/><span className={signal.canCompare ? styles.activeFlow : ""}>COMPARE</span></div>

      <section className={`${styles.transcript} ${focused ? styles.focused : ""}`} onClick={() => input.current?.focus()}>
        <div className={styles.transcriptHead}><span>Type this passage</span><b>the words are fixed; the timing is yours</b></div>
        <div className={styles.textLayer}>
          <p className={styles.reference}>{passage}</p>
          <p className={styles.typed} aria-live="polite">
            {text.split("").map((letter, index) => {
              const matches = letter.toLowerCase() === passage[index]?.toLowerCase();
              return <span className={matches ? styles.match : styles.mismatch} key={`${index}-${letter}`}>{letter}</span>;
            })}
            <i className={styles.cursor}/>
          </p>
          <textarea ref={input} value={text} onChange={(event) => setText(event.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onKeyDown={(event) => capture("down", event)} onKeyUp={(event) => capture("up", event)} spellCheck={false} aria-label="Type the displayed UB passage" />
        </div>
      </section>

      <div className={styles.eventRail}>
        <span className={styles.keyPulse}><i/>{signal.current.key}</span>
        <div><small>KEY HELD</small><strong>{number(signal.current.hold)} ms</strong></div>
        <div className={signal.current.flight < 0 ? styles.overlap : ""}><small>GAP / OVERLAP</small><strong>{number(signal.current.flight)} ms</strong></div>
        <div><small>PRESS RHYTHM</small><strong>{number(signal.current.cadence)} ms</strong></div>
        <span className={styles.eventCount}>EVENT {signal.completed}</span>
      </div>

      <div className={styles.rhythm}>
        <div className={styles.rhythmHead}><span>Time between presses · latest 30 events</span><b>{number(signal.metrics.keysPerMinute)} keys/min</b></div>
        <div className={styles.bars}>{signal.rhythm.length ? signal.rhythm.map((item, index) => <i className={item < 0 ? styles.negative : ""} style={{ height: `${Math.max(8, Math.min(Math.abs(item), 700) / maxRhythm * 100)}%` }} key={`${index}-${item}`}/>) : <em>Begin typing to draw your cadence</em>}</div>
      </div>

      <div className={styles.readout}>
        <div><span>Mean hold</span><b>{number(signal.metrics.meanHold)} ms</b></div>
        <div><span>Overlap</span><b>{number(signal.metrics.overlapRate * 100, 1)}%</b></div>
        <div><span>Pauses</span><b>{signal.metrics.pauseCount}</b></div>
        <div><span>Corrections</span><b>{signal.metrics.correctionCount}</b></div>
        <div><span>Different keys</span><b>{signal.metrics.distinctKeys}/65</b></div>
      </div>

      <div className={styles.quality} data-quality={signal.quality}><i/><div><strong>{signal.quality === "good" ? "Window ready" : signal.quality === "collecting" ? "Reading the signal" : "Low-diversity input"}</strong><p>{signal.message}</p></div></div>

      <footer className={styles.actions}>
        <div><button className="primary-button" disabled={!signal.canCompare || status === "loading"} onClick={compare} style={!signal.canCompare ? { opacity: .38, cursor: "not-allowed" } : undefined}><Activity size={16}/>{status === "loading" ? "Running TypeTrace…" : "Compare with enrolled profiles"}</button><button className="ghost-button" onClick={reset}><RotateCcw size={16}/> Reset</button></div>
        <span><ScanSearch size={14}/> Your typing stays in this browser</span>
      </footer>

      {prediction && <div className={styles.comparison}><span className="mini-label">Closest profile in this demonstration</span><div className={styles.comparisonHead}><h3>User {prediction.predicted}</h3><b>{(prediction.confidence*100).toFixed(2)}% comparison score</b></div><div className={styles.ranking}>{prediction.top5.map((candidate,index) => <div key={candidate.id} className={styles.candidate}><span>0{index+1}</span><span>User {candidate.id}</span><i className={styles.bar}><i style={{ width: `${candidate.probability*100}%` }}/></i><span>{(candidate.probability*100).toFixed(2)}%</span></div>)}</div><p className={styles.caveat}><strong>This is not proof of identity.</strong> The model must choose one of the 148 enrolled users because it has no “unknown person” option. Treat this as a comparison demo only.</p></div>}
      {status === "error" && <div className={styles.error}>The browser model could not initialize. Reload and try again.</div>}
    </div>
  );
}
