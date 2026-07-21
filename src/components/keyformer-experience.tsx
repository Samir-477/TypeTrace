"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown, Braces, ChevronRight,
  Dice5, Fingerprint,
} from "lucide-react";
import { AnimatePresence, motion, useInView, useReducedMotion, useScroll } from "motion/react";
import type { ModelEvaluation, StoryData, StoryUser } from "@/lib/story-types";
import { SignalRhythmDemo } from "@/components/signal-rhythm-demo";
import { ModelResults } from "@/components/model-results";
import { LiveIdentificationLab } from "@/components/live-identification-lab";
import { FeatureMap } from "@/components/feature-map";
import { PreprocessingVisual } from "@/components/preprocessing-visual";
import { TcnVisual } from "@/components/tcn-visual";
import { TransformerVisual } from "@/components/transformer-visual";
import { IdentitySpaceVisual } from "@/components/identity-space-visual";

const stages = ["Signal", "Features", "Window", "TCN", "Transformer", "Identity", "Result"];

function number(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(value);
}

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { once: true, margin: "-12%" });
  const reduce = useReducedMotion();
  return (
    <motion.div ref={ref} className={className} initial={reduce ? false : { opacity: 0, y: 34 }} animate={visible ? { opacity: 1, y: 0 } : {}} transition={{ duration: .75, ease: [.2,.8,.2,1] }}>
      {children}
    </motion.div>
  );
}

function SectionHeading({ eyebrow, title, copy, index }: { eyebrow: string; title: string; copy: string; index: string }) {
  return (
    <Reveal className="section-copy">
      <div className="eyebrow"><span>{index}</span>{eyebrow}</div>
      <h2>{title}</h2>
      <p>{copy}</p>
    </Reveal>
  );
}

function UserPicker({ users, selected, onSelect }: { users: StoryUser[]; selected?: StoryUser; onSelect: (user: StoryUser) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const shown = users.filter((user) => user.id.includes(query.replace(/\D/g, ""))).slice(0, 24);
  const randomize = () => onSelect(users[Math.floor(Math.random() * users.length)]);

  return (
    <>
      <div className="picker-actions">
        <button className="primary-button" onClick={() => setOpen(true)}>
          <Fingerprint size={17} /> {selected ? `User ${selected.id}` : "Select a user"}<ChevronRight size={16} />
        </button>
        <button className="ghost-button" onClick={randomize}><Dice5 size={17} /> Random</button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
            <motion.div className="user-modal" initial={{ y: 40, opacity: 0, scale: .98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 30, opacity: 0 }} onClick={(event) => event.stopPropagation()}>
              <div className="modal-head">
                <div><h3>Choose a typing profile</h3></div>
                <button className="icon-button" onClick={() => setOpen(false)}>×</button>
              </div>
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search user 001–148" />
              <div className="user-grid">
                {shown.map((user) => (
                  <button key={user.id} className={selected?.id === user.id ? "user-card active" : "user-card"} onClick={() => { onSelect(user); setOpen(false); }}>
                    <span className="user-orbit"><Fingerprint size={19} /></span>
                    <strong>{user.id}</strong>
                    <div className="micro-bars">{user.preview.slice(0, 9).map((point) => <i key={point.i} style={{ height: `${Math.min(100, 16 + Math.abs(point.h) / 4)}%` }} />)}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function KeyformerExperience() {
  const [data, setData] = useState<StoryData | null>(null);
  const [evaluation, setEvaluation] = useState<ModelEvaluation | null>(null);
  const [selectedId, setSelectedId] = useState("001");
  const { scrollYProgress } = useScroll();
  useEffect(() => {
    fetch("/data/story.json").then((response) => response.json()).then(setData);
    fetch("/data/model-results.json").then((response) => response.json()).then(setEvaluation);
  }, []);
  useEffect(() => {
    if (!data || !window.location.hash) return;
    const timer = window.setTimeout(() => document.getElementById(window.location.hash.slice(1))?.scrollIntoView(), 80);
    return () => window.clearTimeout(timer);
  }, [data]);
  const user = data?.users.find((item) => item.id === selectedId) ?? data?.users[0];
  if (!data || !user || !evaluation) return <main className="loading">
    <div className="loading-mark"><Fingerprint size={28}/></div>
    <span>Preparing the TypeTrace story</span>
    <p>Loading recorded users and model results</p>
    <div className="loading-bar"><i/></div>
  </main>;

  return (
    <main>
      <motion.div className="scroll-progress" initial={false} style={{ scaleX: scrollYProgress }} />
      <nav><a href="#top" className="brand"><span><Braces size={16}/></span>TYPETRACE</a><div className="stage-nav">{stages.map((stage, index) => <a key={stage} href={`#stage-${index + 1}`}><i>{String(index + 1).padStart(2,"0")}</i>{stage}</a>)}</div><div className="nav-user"><Fingerprint size={14}/> {user.id}</div></nav>

      <section className="hero" id="top">
        <div className="hero-grid"/><div className="hero-glow"/><div className="floating-token t1">H <b>{user.mean.H.toFixed(0)}</b></div><div className="floating-token t2">UD <b>{user.mean.UD.toFixed(0)}</b></div><div className="floating-token t3">D4</div>
        <Reveal className="hero-content"><div className="eyebrow"><span>TypeTrace v4</span> Keystroke identity, explained</div><h1>Your identity is<br/><em>between</em> the keys.</h1><p>See how the time between key presses becomes a typing pattern, then a predicted user.</p><UserPicker users={data.users} selected={user} onSelect={(next) => setSelectedId(next.id)}/><a className="journey-link" href="#stage-1"><span><ArrowDown/></span>Enter the signal</a></Reveal>
        <div className="dataset-ribbon"><div><b>{data.dataset.users}</b><span>typists</span></div><div><b>{data.dataset.sessions}</b><span>sessions</span></div><div><b>{number(data.dataset.processedEvents)}</b><span>events</span></div><div><b>{data.dataset.features}</b><span>features</span></div></div>
      </section>

      <section className="story-section" id="stage-1"><SectionHeading index="01" eyebrow="Recorded keystrokes" title="Typing creates a timing pattern." copy={`Every press and release has a timestamp. This replay uses User ${user.id}'s recorded timing to show how long keys are held and how quickly the next key begins. These raw timings become the measurements in the next stage.`}/><Reveal className="visual-wrap"><SignalRhythmDemo key={user.id} user={user}/></Reveal></section>
      <section className="story-section feature-story" id="stage-2"><SectionHeading index="02" eyebrow="Feature extraction" title="Timing becomes measurable behavior." copy="The model does not read the meaning of the sentence. It converts the timing into 25 values that describe holds, transitions, speed changes, pauses, overlaps and corrections. Next, these values are prepared for the model."/><Reveal className="visual-wrap"><FeatureMap user={user}/></Reveal></section>
      <section className="story-section preprocess-story" id="stage-3"><SectionHeading index="03" eyebrow="Prepare the sequence" title="Clean the values, then group them." copy="Large timing values are reduced and every feature is placed on a comparable scale. The stream is then divided into overlapping groups of 64 events, giving the model consistent pieces of typing to study."/><Reveal className="visual-wrap"><PreprocessingVisual user={user}/></Reveal></section>
      <section className="story-section" id="stage-4"><SectionHeading index="04" eyebrow="Nearby patterns" title="First, learn what happens locally." copy="The TCN starts with each event and looks backward through nearby keystrokes. Its view grows from 3 to 7 to 15 events, helping it detect short habits such as bursts, hesitations and overlapping keys. The enriched sequence then moves to the Transformer."/><Reveal className="visual-wrap"><TcnVisual/></Reveal></section>
      <section className="story-section transformer-story" id="stage-5"><SectionHeading index="05" eyebrow="Whole-window context" title="Then, connect the complete typing window." copy="The Transformer lets every event use information from all 64 positions. This connects distant pauses, repeated timing patterns and key transitions that the local stage cannot see together. The completed window is ready to become one fingerprint."/><Reveal className="visual-wrap"><TransformerVisual/></Reveal></section>
      <section className="story-section identity-story" id="stage-6"><SectionHeading index="06" eyebrow="Identity fingerprint" title="Turn the whole window into one fingerprint." copy="Three summaries of the window are combined into a 192-number fingerprint. The model compares its direction with the profiles learned for 148 enrolled users. A closer direction produces a stronger match score."/><Reveal className="visual-wrap"><IdentitySpaceVisual user={user}/></Reveal></section>
      <section className="results-section" id="stage-7"><SectionHeading index="07" eyebrow="Final prediction" title="Many windows make one decision." copy="A short window can be uncertain, so the model combines the predictions from several unseen windows. Repeated agreement produces the final user result shown below."/><Reveal><ModelResults user={user} evaluation={evaluation}/></Reveal></section>
      <section className="lab-section"><SectionHeading index="08" eyebrow="Try it yourself" title="See your own timing measurements." copy="Type the displayed passage normally. The page measures your holds, gaps, overlaps, pauses and corrections in this browser. If your sample is varied enough, you can compare it with the enrolled profiles as a demonstration—not as proof of identity."/><Reveal><LiveIdentificationLab key={user.id} prompt={user.replay.sourcePassage}/></Reveal></section>

      <footer><div className="brand"><span><Braces size={16}/></span>TYPETRACE</div><p>TCN × Transformer × ArcFace</p><span>University at Buffalo keystroke dynamics</span></footer>
    </main>
  );
}
