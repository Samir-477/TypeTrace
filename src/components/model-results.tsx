"use client";

import { Check } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ModelEvaluation, StoryUser } from "@/lib/story-types";

const trainingCurve = [
  [1,15.75],[5,74.86],[10,85.48],[15,88.23],[20,88.89],[25,89.21],[30,91.29],
  [35,92.13],[40,92.65],[45,92.10],[50,92.31],[55,93.57],[60,93.83],[65,92.66],[70,93.29],
].map(([epoch, accuracy]) => ({ epoch, accuracy }));

export function ModelResults({ user, evaluation }: { user: StoryUser; evaluation: ModelEvaluation }) {
  const result = evaluation.users.find((entry) => entry.id === user.id);
  if (!result) return null;
  const confidence = result.confidence * 100;
  return (
    <div className="results-grid">
      <div className="result-hero glass-panel">
        <div className="success-icon"><Check /></div>
        <span className="mini-label">Tested on {result.windows} unseen typing windows</span>
        <h3>User {result.predicted}</h3>
        <p>{result.correct ? `The combined windows correctly identify User ${user.id}.` : `The model predicted User ${result.predicted}; the expected result was User ${user.id}.`}</p>
        <div className="confidence"><span style={{ width: `${confidence}%` }}/></div>
        <div className="confidence-label"><span>Combined confidence</span><b>{confidence.toFixed(2)}%</b></div>
        <div style={{ marginTop: 28, display: "grid", gap: 9 }}>
          {result.top5.map((candidate, index) => (
            <div key={candidate.id} style={{ display: "grid", gridTemplateColumns: "28px 62px 1fr 58px", alignItems: "center", gap: 10, color: index === 0 ? "#b6ff5c" : "#77827f", font: "500 9px var(--font-mono)" }}>
              <span>0{index + 1}</span><b>User {candidate.id}</b><i style={{ display: "block", height: 4, borderRadius: 4, background: "#ffffff0c", overflow: "hidden" }}><i style={{ display: "block", width: `${candidate.probability * 100}%`, height: "100%", background: index === 0 ? "#b6ff5c" : "#8d7cff" }}/></i><span style={{ textAlign: "right" }}>{(candidate.probability * 100).toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="metric-card glass-panel"><span>Single-window accuracy</span><b>{(evaluation.windowAccuracy * 100).toFixed(2)}%</b><small>{evaluation.totalWindows.toLocaleString()} windows</small></div>
      <div className="metric-card glass-panel"><span>Final user accuracy</span><b>{Math.round(evaluation.userAccuracy * evaluation.users.length)}/{evaluation.users.length}</b><small>users identified correctly</small></div>
      <div className="curve-card glass-panel">
        <div className="chart-head"><span>Accuracy during training</span><small>unseen validation windows</small></div>
        <ResponsiveContainer width="100%" height={220}><AreaChart data={trainingCurve}><defs><linearGradient id="acc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b6ff5c" stopOpacity=".45"/><stop offset="1" stopColor="#b6ff5c" stopOpacity="0"/></linearGradient></defs><CartesianGrid stroke="#ffffff0b" vertical={false}/><XAxis dataKey="epoch" stroke="#5e696b" fontSize={11}/><YAxis domain={[0,100]} hide/><Tooltip contentStyle={{ background: "#111718", border: "1px solid #283234", borderRadius: 12 }}/><Area type="monotone" dataKey="accuracy" stroke="#b6ff5c" fill="url(#acc)" strokeWidth={2}/></AreaChart></ResponsiveContainer>
      </div>
    </div>
  );
}
