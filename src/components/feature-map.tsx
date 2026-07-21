"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { StoryUser } from "@/lib/story-types";
import styles from "./feature-map.module.css";

type Feature = { key: string; label: string; formula: string; copy: string; unit?: "ms" | "%" | "ratio" | "category" };
type Family = { id: string; label: string; color: string; features: Feature[] };

const families: Family[] = [
  { id: "basic", label: "Basic timing", color: "#b6ff5c", features: [
    { key: "H", label: "Hold time", formula: "release₁ − press₁", copy: "How long one key remains pressed.", unit: "ms" },
    { key: "UD", label: "Flight time", formula: "press₂ − release₁", copy: "The gap between releasing one key and pressing the next. A negative value means the keys overlapped.", unit: "ms" },
    { key: "DD", label: "Press cadence", formula: "press₂ − press₁", copy: "The time from one key press to the next—the basic beat of typing.", unit: "ms" },
    { key: "UU", label: "Release cadence", formula: "release₂ − release₁", copy: "The time from one key release to the next.", unit: "ms" },
  ]},
  { id: "motion", label: "Motion", color: "#b6ff5c", features: [
    { key: "speed", label: "Typing speed", formula: "1 / DD", copy: "Turns the gap between presses into a simple speed value.", unit: "ratio" },
    { key: "acceleration", label: "Acceleration", formula: "UDₜ − UDₜ₋₁", copy: "Shows whether the transitions are getting faster or slower.", unit: "ms" },
    { key: "jerk", label: "Rhythm jerk", formula: "accelerationₜ − accelerationₜ₋₁", copy: "Highlights sudden changes in speed, such as a brief hesitation or burst.", unit: "ms" },
  ]},
  { id: "relative", label: "Relative timing", color: "#8d7cff", features: [
    { key: "norm_H", label: "Normalized hold", formula: "H / DD", copy: "Shows how much of the press-to-press interval was spent holding the key.", unit: "ratio" },
    { key: "ud_ratio", label: "Flight ratio", formula: "UD / DD", copy: "Shows how much of the interval was a gap or overlap between keys.", unit: "ratio" },
    { key: "h_ratio", label: "Hold–release ratio", formula: "H / UU", copy: "Compares how long a key was held with the release rhythm.", unit: "ratio" },
    { key: "hold_norm_prev", label: "Previous-hold ratio", formula: "Hₜ / |Hₜ₋₁|", copy: "Compares this key hold with the previous key hold.", unit: "ratio" },
    { key: "flight_balance", label: "Flight balance", formula: "ΔUD / (|UDₜ| + |UDₜ₋₁|)", copy: "Compares two neighboring gaps to show whether the rhythm stayed even.", unit: "ratio" },
    { key: "hold_speed_ratio", label: "Hold–speed ratio", formula: "H / DD", copy: "Compares holding time with the surrounding typing speed.", unit: "ratio" },
    { key: "inter_session_norm", label: "Local timing baseline", formula: "DD / median₂₀(DD) − 1", copy: "Compares the current press rhythm with the user's recent rhythm.", unit: "ratio" },
  ]},
  { id: "sequence", label: "Sequence memory", color: "#79d9ff", features: [
    { key: "digraph_DD", label: "Extended press span", formula: "press₃ − press₁", copy: "Measures press timing across three keys instead of only two.", unit: "ms" },
    { key: "digraph_UU", label: "Extended release span", formula: "release₃ − release₁", copy: "Measures release timing across three keys.", unit: "ms" },
    { key: "rhythm_var", label: "Rhythm change", formula: "(UDₜ − UDₜ₋₁)²", copy: "Makes changes between neighboring gaps easier for the model to notice.", unit: "ratio" },
    { key: "trigraph_flight", label: "Forward flight", formula: "press₃ − release₂", copy: "Measures the transition from the second key to the third key.", unit: "ms" },
    { key: "bigram_h_sum", label: "Two-key hold", formula: "H₁ + H₂", copy: "Adds two neighboring hold times to describe a short two-key pattern.", unit: "ms" },
  ]},
  { id: "context", label: "Behavior + context", color: "#ffb45c", features: [
    { key: "pause", label: "Pause", formula: "UD > 200 ms", copy: "Marks a gap longer than 200 ms.", unit: "%" },
    { key: "overlap", label: "Key overlap", formula: "UD < 0", copy: "Marks when the next key begins before the previous key is released.", unit: "%" },
    { key: "is_backspace", label: "Correction", formula: "key = Backspace", copy: "Marks a Backspace correction.", unit: "%" },
    { key: "key_cat", label: "Key category", formula: "letter · digit · space · symbol · modifier", copy: "Labels the key as a letter, number, space, symbol or modifier without reading the word.", unit: "category" },
    { key: "consec_same", label: "Repeated key", formula: "key₁ = key₂", copy: "Marks when the same key is pressed twice in a row.", unit: "%" },
    { key: "modifier_context", label: "Modifier context", formula: "previous key is modifier", copy: "Marks when Shift, Control or Alt affected the current key.", unit: "%" },
  ]},
];

function FeatureVisual({ family, feature }: { family: Family; feature: Feature }) {
  if (family.id === "basic") {
    const positions = [7, 35, 64, 93];
    const intervals: Record<string, [number, number, number]> = { H:[7,35,24], UD:[35,64,128], DD:[7,64,170], UU:[35,93,1] };
    return <div className={styles.timingVisual}>{["press₁","release₁","press₂","release₂"].map((label,index) => <div className={styles.timePoint} style={{ left:`${positions[index]}%` }} key={label}><i/><span>{label}</span></div>)}{Object.entries(intervals).map(([key,[start,end,top]]) => <div className={`${styles.timeSpan} ${key === "UD" || key === "DD" ? styles.bottomSpan : ""} ${key === feature.key ? styles.highlightSpan : ""}`} style={{ left:`${start}%`, width:`${end-start}%`, top }} key={key}><b>{key}</b></div>)}</div>;
  }
  if (family.id === "motion") return <div className={styles.motionVisual}><span>slower</span><div>{[38,58,42,76,52,88,67,94,60,81,48,70].map((height,index) => <i style={{ height:`${height}%` }} key={index}/>)}</div><span>faster</span><motion.em animate={{ x:[0,210,0] }} transition={{ duration:4,repeat:Infinity,ease:"easeInOut" }}/></div>;
  if (family.id === "relative") return <div className={styles.ratioVisual}><div><i style={{ height:"72%" }}/><span>current</span></div><strong>÷</strong><div><i style={{ height:"48%" }}/><span>baseline</span></div><b>{feature.formula}</b></div>;
  if (family.id === "sequence") return <div className={styles.sequenceVisual}>{["KEY 1","KEY 2","KEY 3"].map((label,index) => <div key={label}><i>{index+1}</i><span>{label}</span></div>)}<motion.b animate={{ scaleX:[.08,1,.08] }} transition={{ duration:3,repeat:Infinity,ease:"easeInOut" }}/></div>;
  return <div className={styles.contextVisual}>{["A","S","SPACE","BACK","D"].map((key,index) => <motion.i animate={index === 2 ? { borderColor:["#26302e",family.color,"#26302e"], color:["#65706d",family.color,"#65706d"] } : {}} transition={{ duration:2,repeat:Infinity }} className={key === "SPACE" ? styles.spaceKey : ""} key={key}>{key}</motion.i>)}<span>{feature.formula}</span></div>;
}

function shownValue(feature: Feature, raw: number) {
  if (feature.unit === "%") return `${(raw * 100).toFixed(1)}%`;
  if (feature.unit === "ms") return `${raw.toFixed(1)} ms`;
  if (feature.unit === "category") return raw.toFixed(2);
  return Math.abs(raw) < 10 ? raw.toFixed(4) : raw.toFixed(2);
}

export function FeatureMap({ user }: { user: StoryUser }) {
  const [familyIndex, setFamilyIndex] = useState(0);
  const [slide, setSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const family = families[familyIndex];
  const feature = family.features[slide];
  const chooseFamily = (index: number) => { setDirection(index >= familyIndex ? 1 : -1); setFamilyIndex(index); setSlide(0); };
  const move = (step: number) => { setDirection(step); setSlide((current) => (current + step + family.features.length) % family.features.length); };

  return <div className={`${styles.shell} glass-panel`} style={{ "--accent": family.color } as React.CSSProperties}>
    <header className={styles.header}><div><span>25 timing measurements</span><b>Choose a group, then use Previous and Next</b></div><small>User {user.id} · recorded mean</small></header>
    <div className={styles.filters} role="tablist" aria-label="Feature families">{families.map((item,index) => <button className={index === familyIndex ? styles.activeFilter : ""} onClick={() => chooseFamily(index)} key={item.id}><i>{String(index+1).padStart(2,"0")}</i><span>{item.label}</span><b>{item.features.length}</b></button>)}</div>

    <div className={styles.viewport}>
      <section className={styles.slide}>
        <div className={styles.lessonSlot}>
          <AnimatePresence mode="wait">
            <motion.div className={styles.lesson} key={`${family.id}-${feature.key}`} initial={{ opacity:0, x:direction*45 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:direction*-35 }} transition={{ duration:.38,ease:[.2,.8,.2,1] }}><span>{family.label} · {String(slide+1).padStart(2,"0")}</span><h3>{feature.label}</h3><code>{feature.formula}</code><p>{feature.copy}</p><div><small>User {user.id} mean</small><b>{shownValue(feature,user.mean[feature.key] ?? 0)}</b></div></motion.div>
          </AnimatePresence>
        </div>
        <div className={styles.visual}><FeatureVisual family={family} feature={feature}/></div>
      </section>
    </div>
    <div className={styles.sliderNav}>
      <button onClick={() => move(-1)} aria-label="Previous feature"><ArrowLeft size={17}/><span>Previous</span></button>
      <div><span>{String(slide+1).padStart(2,"0")} / {String(family.features.length).padStart(2,"0")}</span><i>{family.features.map((item,index) => <button aria-label={`Show ${item.label}`} className={index === slide ? styles.activeDot : ""} onClick={() => { setDirection(index >= slide ? 1 : -1); setSlide(index); }} key={item.key}/>)}</i><b>{feature.label}</b></div>
      <button onClick={() => move(1)} aria-label="Next feature"><span>Next feature</span><ArrowRight size={17}/></button>
    </div>
  </div>;
}
