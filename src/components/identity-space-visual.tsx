"use client";

import { ArrowRight, BrainCircuit, Check, Fingerprint, ScanSearch } from "lucide-react";
import { motion } from "motion/react";
import type { StoryUser } from "@/lib/story-types";
import styles from "./identity-space-visual.module.css";

const evidence = [
  { mark: "CLS", name: "What the summary token learned", weight: 46 },
  { mark: "MEAN", name: "Average information from all events", weight: 21 },
  { mark: "FOCUS", name: "The events the model found important", weight: 33 },
];

function fingerprint(seed: number, offset = 0) {
  return Array.from({ length: 22 }, (_, index) =>
    24 + ((seed * 17 + index * 31 + offset * 23 + (index % 4) * seed) % 70),
  );
}

export function IdentitySpaceVisual({ user }: { user: StoryUser }) {
  const numericId = Number.parseInt(user.id, 10) || 1;
  const candidates = [
    { label: `User ${user.id} profile`, state: "closest", offset: 0 },
    { label: "Another enrolled profile", state: "farther", offset: 4 },
    { label: "Another enrolled profile", state: "farther", offset: 9 },
  ];
  const captured = fingerprint(numericId);

  return (
    <div className={`${styles.shell} glass-panel`}>
      <header className={styles.header}><div><span>Identity comparison</span><b>Build one fingerprint, then find the closest enrolled profile</b></div></header>
      <div className={styles.rail} aria-hidden="true">
        <span><i>01</i> Combine the window</span><ArrowRight />
        <span><i>02</i> Check enrolled profiles</span><ArrowRight />
        <span><i>03</i> Choose the closest match</span>
      </div>
      <main className={styles.arena}>
        <section className={styles.builder}>
          <div className={styles.sectionLabel}><BrainCircuit /> THREE WINDOW SUMMARIES</div>
          <h3>Combine the whole window into one fingerprint.</h3>
          <div className={styles.evidenceList}>
            {evidence.map((item, index) => (
              <motion.div key={item.mark} initial={{ opacity: 0, x: -14 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.12 }}>
                <i>{item.mark}</i><span><b>{item.name}</b></span>
                <em style={{ "--weight": `${item.weight}%` } as React.CSSProperties} />
              </motion.div>
            ))}
          </div>
          <div className={styles.fusion}><span /><b>LEARNED MIX</b><span /></div>
          <div className={styles.fingerprintCard}>
            <div><Fingerprint /><span><small>ONE TYPING WINDOW</small><b>192-number rhythm fingerprint</b></span></div>
            <div className={styles.bars}>{captured.map((height, index) => <motion.i key={index} style={{ "--height": `${height}%` } as React.CSSProperties} initial={{ scaleY: .08 }} whileInView={{ scaleY: 1 }} transition={{ delay: .25 + index * .018 }} />)}</div>
          </div>
        </section>
        <section className={styles.matcher}>
          <div className={styles.sectionLabel}><ScanSearch /> COMPARE WITH LEARNED USERS</div>
          <div className={styles.matchHeading}><div><h3>Which enrolled profile is most similar?</h3><p>The model compares the new fingerprint with all 148 user profiles learned during training.</p></div><strong>148<br /><small>IDENTITIES</small></strong></div>
          <div className={styles.candidates}>
            {candidates.map((candidate, candidateIndex) => {
              const values = fingerprint(numericId, candidate.offset);
              return <motion.div className={candidateIndex === 0 ? styles.winner : ""} key={`${candidate.label}-${candidateIndex}`} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: .35 + candidateIndex * .12 }}>
                <span className={styles.rank}>0{candidateIndex + 1}</span><span className={styles.person}><b>{candidate.label}</b></span>
                <span className={styles.miniPrint}>{values.map((height, index) => <i key={index} style={{ "--height": `${height}%` } as React.CSSProperties} />)}</span>
                <span className={styles.score}><b>{candidate.state}</b></span>{candidateIndex === 0 && <Check />}
              </motion.div>;
            })}
          </div>
          <div className={styles.decision}>
            <div className={styles.gauge}>
              <div className={styles.target}><i /><span>USER {user.id}<small>enrolled profile</small></span></div>
              <motion.div className={styles.sample} initial={{ width: "34%" }} whileInView={{ width: "91%" }} transition={{ duration: 1.1, ease: "easeOut" }}><i /></motion.div>
              <span className={styles.angle}>more similar</span>
            </div>
            <div className={styles.verdict}><Fingerprint /><span><small>CLOSEST ENROLLED PROFILE</small><b>User {user.id}</b></span><em>strongest match</em></div>
          </div>
        </section>
      </main>
    </div>
  );
}
