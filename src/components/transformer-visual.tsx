"use client";

import { ArrowRight, Layers3 } from "lucide-react";
import { motion } from "motion/react";
import styles from "./transformer-visual.module.css";

const TOKENS = ["CLS", "01", "02", "03", "04", "05", "06", "07", "64"];
const strength = (row: number, column: number) => {
  if (row === 4 && [0, 2, 4, 7].includes(column)) return [.92, .75, 1, .68][[0,2,4,7].indexOf(column)];
  if (row === column) return .65;
  return .08 + ((row * 13 + column * 7 + 3) % 7) / 16;
};

export function TransformerVisual() {
  return <div className={`${styles.shell} glass-panel`}>
    <header><div><span>Whole-window reader</span><b>Connect information across all 64 events</b></div></header>

    <div className={styles.prepare}>
      <div><span>TCN output</span><b>64 enriched events</b></div><ArrowRight/><div><span>Keep the order</span><b>add each event&apos;s position</b></div><ArrowRight/><div className={styles.cls}><span>Add one summary token</span><b>collect the whole window</b></div>
    </div>

    <div className={styles.stage}>
      <div className={styles.matrixArea}>
        <div className={styles.matrixHead}><span>How one event reads the window</span><b>brighter squares = stronger connection</b></div>
        <div className={styles.matrixWrap}>
          <div className={styles.columnLabels}>{TOKENS.map((token) => <span key={token}>{token}</span>)}</div>
          <div className={styles.rowLabels}>{TOKENS.map((token,index) => <span className={index===4 ? styles.activeLabel : ""} key={token}>{token}</span>)}</div>
          <div className={styles.matrix}>{TOKENS.flatMap((_,row) => TOKENS.map((__,column) => <motion.i className={row===4 ? styles.activeCell : ""} style={{opacity:strength(row,column)}} initial={{scale:.5,opacity:0}} whileInView={{scale:1,opacity:strength(row,column)}} transition={{delay:(row*9+column)*.006}} key={`${row}-${column}`}/>))}<motion.em animate={{y:[0,128,0]}} transition={{duration:4,repeat:Infinity,ease:"easeInOut"}}/></div>
        </div>
      </div>

      <div className={styles.interpretation}>
        <span>How to read this</span>
        <h3>One event can use clues from anywhere in the window.</h3>
        <p>Each row represents an event being updated. A brighter square means that another position contributes more information to it.</p>
        <div className={styles.heads}><header><span>Look for different patterns</span><b>8 views in parallel</b></header><div>{Array.from({length:8},(_,index)=><motion.i initial={{scaleX:.15}} whileInView={{scaleX:1}} transition={{delay:.15+index*.07}} style={{"--head":`${15+index*7}%`} as React.CSSProperties} key={index}><span>H{index+1}</span></motion.i>)}</div><small>Different views can focus on pauses, repeated rhythm, overlaps or key context.</small></div>
        <div className={styles.layers}><Layers3/><span><small>REPEAT 6 TIMES</small><b>Each layer improves every event using the context it gathered.</b></span></div>
      </div>
    </div>
  </div>;
}
