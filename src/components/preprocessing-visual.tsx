"use client";

import { useState } from "react";
import { ArrowRight, Braces, ChevronDown, Database, Layers3 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { StoryUser } from "@/lib/story-types";
import styles from "./preprocessing-visual.module.css";

const H_TRAIN_MEAN = 4.69963674939702;
const H_TRAIN_SCALE = 0.40226915657649837;
const LOG_FEATURES = ["H", "UD", "DD", "UU", "digraph_DD", "digraph_UU", "trigraph_flight", "bigram_h_sum"];
const steps = [
  { id: "log", number: "01", title: "Signed log: reduce extreme values", summary: "Shrink very long pauses without hiding negative overlaps.", result: "Stable values" },
  { id: "scale", number: "02", title: "Standardize: use one scale", summary: "Make milliseconds, ratios and flags easier to compare.", result: "Comparable values" },
  { id: "window", number: "03", title: "Window: group 64 events", summary: "Move forward 16 events at a time, so neighboring windows share context.", result: "75% shared" },
  { id: "tensor", number: "04", title: "Route: keep key pairs separate", summary: "Send timing values and key-pair codes through the correct model inputs.", result: "Two inputs" },
] as const;
type StepId = typeof steps[number]["id"];

function TechnicalDetail({ active, user }: { active: StepId; user: StoryUser }) {
  const example = user.preview[0];
  const rawH = example?.h ?? 0;
  const logH = Math.sign(rawH) * Math.log1p(Math.abs(rawH));
  const zH = (logH - H_TRAIN_MEAN) / H_TRAIN_SCALE;
  return <div className={styles.detail}>
    <div className={styles.lesson}>
      <span>Optional technical detail</span>
      {active === "log" && <><h3>Reduce extreme timings without losing overlaps.</h3><p>Long pauses can dominate the other values. The signed log shrinks large values while keeping negative gaps negative.</p><aside><strong>Why signed?</strong> A normal log cannot process negative overlap values.</aside></>}
      {active === "scale" && <><h3>Put every feature on a comparable scale.</h3><p>A millisecond value can be much larger than a ratio. A z-score shows how far each value is from its training average.</p><aside><strong>Important:</strong> only training data is used to calculate this scale.</aside></>}
      {active === "window" && <><h3>Keep the rhythm connected across windows.</h3><p>Each window contains 64 events. The next begins 16 events later, so 48 events are shared and the rhythm is not cut abruptly.</p><aside><strong>Overlap:</strong> 48 of 64 events are shared, which is 75%.</aside></>}
      {active === "tensor" && <><h3>Treat measurements and key codes differently.</h3><p>Timing values have numerical size, but a key-pair code is only a category. The model therefore sends them through separate inputs.</p><aside><strong>Example:</strong> key-pair code 100 is not “more” than code 20.</aside></>}
    </div>
    <div className={styles.visual}>
      {active === "log" && <div className={styles.logVisual}><code>x′ = sign(x) · log(1 + |x|)</code><div><span><small>RAW H · EVENT {example?.i ?? 1}</small><b>{rawH.toFixed(2)} ms</b></span><ArrowRight/><span><small>SIGNED-LOG H</small><b>{logH.toFixed(4)}</b></span></div><section>{LOG_FEATURES.map((feature) => <i key={feature}>{feature}</i>)}</section><p>Only these eight heavy-tailed channels receive this transform.</p></div>}
      {active === "scale" && <div className={styles.scaleVisual}><code>z = (x′ − μ<sub>train</sub>) / σ<sub>train</sub></code><div><span><small>x′</small><b>{logH.toFixed(4)}</b></span><i>−</i><span><small>μ train</small><b>{H_TRAIN_MEAN.toFixed(4)}</b></span><i>÷</i><span><small>σ train</small><b>{H_TRAIN_SCALE.toFixed(4)}</b></span><i>=</i><span><small>z-score H</small><b>{zH.toFixed(3)}σ</b></span></div><p><Database/>Scaler reconstructed from <strong>6,874,240 weighted training observations</strong>.</p></div>}
      {active === "window" && <div className={styles.windowVisual}><header><span>80-event excerpt</span><b>stride = 16</b></header><div className={styles.ruler}>{Array.from({length:20},(_,index)=><i key={index}/>)}</div><div className={styles.windowA}><span>WINDOW A</span><b>events 01–64</b></div><motion.div className={styles.windowB} initial={{x:-80}} animate={{x:0}} transition={{duration:.8,ease:[.2,.8,.2,1]}}><span>WINDOW B</span><b>events 17–80</b></motion.div><div className={styles.overlap}><i/><span>48 shared events · 75% overlap</span><i/></div></div>}
      {active === "tensor" && <div className={styles.tensorVisual}><div><Layers3/><span><small>CONTINUOUS ROUTE</small><b>25 features → signed-log (8) → z-score</b></span><ArrowRight/><code>float32 [B, 64, 25]</code></div><div><Braces/><span><small>CATEGORICAL ROUTE</small><b>key_pair_id → clamp 0…127</b></span><ArrowRight/><code>int64 [B, 64]</code></div><p>The routes meet after the categorical embedding lookup inside TypeTrace.</p></div>}
    </div>
  </div>;
}

export function PreprocessingVisual({ user }: { user: StoryUser }) {
  const [open, setOpen] = useState<StepId | null>(null);
  return <div className={`${styles.shell} glass-panel`}>
    <header className={styles.header}><div><span>Prepare the model input</span><b>Four steps turn the feature stream into consistent windows</b></div></header>
    <div className={styles.stack}>
      {steps.map((step) => {
        const expanded = open === step.id;
        return <article className={expanded ? styles.open : ""} key={step.id}>
          <div className={styles.summary}>
            <i>{step.number}</i><span><b>{step.title}</b><small>{step.summary}</small></span><em>{step.result}</em><button className={styles.toggle} onClick={() => setOpen(expanded ? null : step.id)} aria-expanded={expanded} aria-controls={`preprocess-${step.id}`}><span>{expanded ? "Close details" : "See how it works"}</span><ChevronDown className={expanded ? styles.rotated : ""} size={20}/></button>
          </div>
          <AnimatePresence initial={false}>{expanded && <motion.div id={`preprocess-${step.id}`} initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:.38,ease:[.2,.8,.2,1]}} className={styles.drawer}><TechnicalDetail active={step.id} user={user}/></motion.div>}</AnimatePresence>
        </article>;
      })}
    </div>
  </div>;
}
