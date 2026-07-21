"use client";

import { ArrowDown, ArrowRight, Braces, Plus } from "lucide-react";
import { motion } from "motion/react";
import styles from "./tcn-visual.module.css";

const rows = [
  { key: "D1", dilation: 1, visible: 3, color: "#b6ff5c" },
  { key: "D2", dilation: 2, visible: 7, color: "#79d9ff" },
  { key: "D4", dilation: 4, visible: 15, color: "#8d7cff" },
];

export function TcnVisual() {
  const nodes = Array.from({ length: 15 }, (_, index) => index);
  return <div className={`${styles.shell} glass-panel`}>
    <header><div><span>Nearby pattern reader</span><b>Look backward through 3, then 7, then 15 events</b></div></header>

    <div className={styles.fusion}>
      <div><span>25 timing features</span><b>what happened</b></div><Plus/><div><span>Key-pair code</span><b>which keys were involved</b></div><ArrowDown/>
      <strong><Braces/><span>combine each event</span><b>one 192-number representation</b></strong>
    </div>

    <div className={styles.context}>
      <div className={styles.contextHead}><span><ArrowRight/> earlier events</span><b>current event</b></div>
      <div className={styles.rows}>
        {rows.map((row, rowIndex) => <div className={styles.row} style={{"--row":row.color} as React.CSSProperties} key={row.key}>
          <div className={styles.rowLabel}><b>{row.key}</b><span>step size {row.dilation}</span></div>
          <div className={styles.track}>{nodes.map((index) => {
            const active = index >= 15 - row.visible;
            return <motion.i className={`${active ? styles.seen : ""} ${index === 14 ? styles.current : ""}`} initial={{opacity:.18,scale:.7}} whileInView={{opacity:active ? 1:.2,scale:1}} transition={{delay:.18 + rowIndex*.25 + Math.max(0,index-(15-row.visible))*.035}} key={index}/>;
          })}<motion.em initial={{scaleX:0}} whileInView={{scaleX:1}} transition={{delay:.2+rowIndex*.25,duration:.6}} style={{left:`${(15-row.visible)/15*100}%`,width:`${row.visible/15*100}%`}}/></div>
          <div className={styles.view}><b>{row.visible}</b><span>events used</span></div>
        </div>)}
      </div>
      <div className={styles.causal}><i/><span>Each row uses only the current and earlier events.</span><i/></div>
    </div>

    <div className={styles.explanation}>The highlighted block is the event being understood. Each row adds more of its recent history: first <strong>3 events</strong>, then <strong>7</strong>, then <strong>15</strong>. This reveals short typing habits before the model examines the full window.</div>
  </div>;
}
