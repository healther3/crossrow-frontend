import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Wrench, Terminal } from 'lucide-react';

export default function AgentTracePanel({ steps, tokenUsage }) {
    const [expanded, setExpanded] = useState(false);

    if (!steps || steps.length === 0) return null;

    return (
        <div className="mb-4 bg-slate-900/60 border border-slate-700/50 rounded-xl overflow-hidden font-mono text-sm shadow-lg backdrop-blur-sm">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-3 px-4 bg-slate-800/80 hover:bg-slate-700/80 transition-colors text-slate-300 border-b border-transparent hover:border-slate-600 cursor-pointer"
            >
                <span className="flex items-center gap-2 font-bold tracking-wide">
                    {expanded ? <ChevronDown size={16} className="text-blue-400"/> : <ChevronRight size={16} className="text-blue-400"/>}
                    <Terminal size={14} className="text-slate-400" />
                    Agent Trace Logs ({steps.length} ops)
                </span>
                {tokenUsage && (
                    <span className="text-xs text-green-400/80 bg-green-900/20 px-2 py-1 rounded">
                        Tokens: {tokenUsage.totalTokens}
                    </span>
                )}
            </button>

            {expanded && (
                <div className="p-4 space-y-5 text-slate-300">
                    {steps.map((step, idx) => (
                        <div key={idx} className="relative space-y-2 border-l-2 border-slate-600 pl-4 py-1">
                            <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-slate-500 shadow-[0_0_5px_rgba(100,116,139,0.8)]"></div>
                            <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">Step {step.stepNumber}</div>

                            {step.thinking && (
                                <div className="text-slate-400 italic tracking-wide leading-relaxed">
                                    "{step.thinking}"
                                </div>
                            )}

                            {step.toolCalls && step.toolCalls.map((tool, tIdx) => (
                                <div key={tIdx} className="bg-black/50 p-3 rounded-lg border border-blue-900/40 space-y-2 mt-2 group">
                                    <div className="text-blue-400 font-bold flex items-center gap-2">
                                        <Wrench size={14} /> {tool.toolName}
                                        <span className="text-slate-600 text-xs ml-auto font-normal">{tool.elapsedMs}ms</span>
                                    </div>
                                    <div className="text-slate-500 text-xs break-all">
                                        <span className="text-purple-400/70">Args:</span> {tool.arguments}
                                    </div>
                                    <div className="text-green-400/70 text-xs mt-2 line-clamp-3 group-hover:line-clamp-none cursor-pointer bg-green-950/20 p-2 rounded">
                                        <span className="text-green-500/70">Result:</span> {tool.result}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}