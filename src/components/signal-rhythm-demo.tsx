"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleDot, Pause, Play, RotateCcw } from "lucide-react";
import type { ReplayEvent, StoryUser } from "@/lib/story-types";
import styles from "./signal-rhythm-demo.module.css";

const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const visualKey = (event?: ReplayEvent) => {
  if (!event) return "";
  if (event.char === " ") return "SPACE";
  if (event.char === "\b") return "BACKSPACE";
  return event.key.length === 1 ? event.key.toUpperCase() : event.char.toUpperCase();
};

function reconstructedText(events: ReplayEvent[], through: number) {
  const text: string[] = [];
  for (const event of events.slice(0, through + 1)) {
    if (event.char === "\b") text.pop();
    else text.push(event.char);
  }
  return text.join("");
}

export function SignalRhythmDemo({ user }: { user: StoryUser }) {
  const events = user.replay.events;
  const [cursor, setCursor] = useState(0);
  const [phase, setPhase] = useState<"down" | "up">("down");
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const event = events[cursor % events.length];
  const typed = reconstructedText(events, cursor % events.length);
  const activeKey = visualKey(event);
  const timelineStart = Math.floor((cursor % events.length) / 24) * 24;
  const timeline = events.slice(timelineStart, timelineStart + 24);

  useEffect(() => {
    if (!playing || !event) return;
    const rawGap = Math.max(1, event.dd);
    const visualGap = clamp(rawGap / speed, 40, event.pause ? 1600 : 900);
    const hold = clamp(event.h / speed, 25, Math.max(30, visualGap - 8));
    const releaseTimer = window.setTimeout(() => setPhase("up"), hold);
    const nextTimer = window.setTimeout(() => {
      setPhase("down");
      setCursor((value) => (value + 1) % events.length);
    }, visualGap);
    return () => { window.clearTimeout(releaseTimer); window.clearTimeout(nextTimer); };
  }, [cursor, event, events.length, playing, speed]);

  const stats = useMemo(() => ({
    meanHold: events.reduce((sum, item) => sum + item.h, 0) / events.length,
    overlaps: events.filter((item) => item.overlap).length / events.length * 100,
    pauses: events.filter((item) => item.pause).length,
    corrections: events.filter((item) => item.backspace).length,
  }), [events]);

  const reset = () => { setCursor(0); setPhase("down"); setPlaying(true); };

  return (
    <div className={`${styles.shell} glass-panel`}>
      <div className={styles.toolbar}>
        <span><CircleDot size={14}/> RECORDED TYPING REPLAY</span>
        <b>User {user.id}</b>
      </div>

      <div className={styles.statement}>
        <div className={styles.statementHead}><span>Reference passage</span><b>same words · User {user.id}&apos;s timing</b></div>
        <div style={{ position: "relative" }}>
          <div className={styles.text} style={{ color: "#35403d" }}>{user.replay.sourcePassage.toLowerCase()}</div>
          <div className={styles.text} style={{ position: "absolute", inset: 0, color: "transparent", pointerEvents: "none" }} aria-live="polite">
            {typed.split("").map((letter, index) => {
              const expected = user.replay.sourcePassage.toLowerCase()[index];
              const matches = letter.toLowerCase() === expected;
              return <span key={`${index}-${letter}`} style={{ color: matches ? "#a7b1ad" : "#ffb45c", textShadow: matches ? "none" : "0 0 12px #ffb45c55" }}>{letter}</span>;
            })}
            <span className={styles.active}>&nbsp;</span>
          </div>
        </div>
      </div>

      <div className={styles.eventLine}>
        <span className={`${styles.eventBadge} ${phase === "up" ? styles.up : ""}`}><i/>{phase === "down" ? "KeyDown" : "KeyUp"} · {activeKey}</span>
        {event?.backspace ? <span className={`${styles.eventBadge} ${styles.up}`}><i/>Correction</span> : null}
        {event?.pause ? <span className={`${styles.eventBadge} ${styles.up}`}><i/>Pause detected</span> : null}
        {event?.overlap ? <span className={`${styles.eventBadge} ${styles.up}`}><i/>Keys overlap</span> : null}
        <span className={styles.timestamp}>Event {cursor + 1} of {events.length}</span>
      </div>

      <div className={styles.body}>
        <div className={styles.keyboard}>
          {KEY_ROWS.map((row) => <div className={styles.keyRow} key={row}>{row.split("").map((key) => <div className={`${styles.key} ${activeKey === key ? styles.active : ""}`} key={key}>{key}</div>)}</div>)}
          <div style={{ display: "flex", gap: 7, justifyContent: "center" }}>
            <div className={`${styles.key} ${styles.space} ${activeKey === "SPACE" ? styles.active : ""}`}>SPACE</div>
            <div className={`${styles.key} ${styles.space} ${activeKey === "BACKSPACE" ? styles.active : ""}`}>BACKSPACE</div>
          </div>
        </div>
        <div className={styles.capture}>
          <div className={`${styles.metric} ${phase === "down" ? styles.focus : ""}`}><span>H · key held</span><b>{event?.h ?? 0} ms</b></div>
          <div className={`${styles.metric} ${event?.overlap ? styles.focus : ""}`}><span>UD · gap or overlap</span><b>{event?.ud ?? 0} ms</b></div>
          <div className={styles.metric}><span>DD · press rhythm</span><b>{event?.dd ?? 0} ms</b></div>
          <div className={styles.metric}><span>UU · release rhythm</span><b>{event?.uu ?? 0} ms</b></div>
        </div>
      </div>

      <div className={styles.rhythm}>
        <div className={styles.rhythmHeader}><span>Time between consecutive presses</span><b>Current gap: {event?.dd ?? 0} ms</b></div>
        <div className={styles.bars}>{timeline.map((item, index) => <i key={item.i} className={`${styles.bar} ${timelineStart + index === cursor % events.length ? styles.active : ""} ${item.pause ? styles.pause : ""}`} style={{ height: `${clamp(item.dd / 8, 9, 100)}%` }}/>)}</div>
      </div>

      <div className={styles.footer}>
        <div className={styles.controls}>
          <button onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={13}/> : <Play size={13}/>}{playing ? "Pause" : "Play"}</button>
          {[.5,1,2].map((value) => <button className={speed === value ? styles.selected : ""} onClick={() => setSpeed(value)} key={value}>{value}×</button>)}
          <button onClick={reset}><RotateCcw size={12}/>Replay</button>
        </div>
        <div className={styles.insight}><div><span>Mean hold</span><b>{stats.meanHold.toFixed(0)} ms</b></div><div><span>Overlap rate</span><b>{stats.overlaps.toFixed(1)}%</b></div><div><span>Pauses</span><b>{stats.pauses}</b></div><div><span>Corrections</span><b>{stats.corrections}</b></div></div>
      </div>
    </div>
  );
}
