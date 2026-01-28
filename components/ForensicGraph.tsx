import React, { useMemo, useCallback } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    Node,
    Edge,
    MarkerType,
    useNodesState,
    useEdgesState,
    Handle,
    Position,
    NodeProps,
    OnConnect,
    addEdge,
    Connection
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Evidence, Witness, TimelineEvent, AIObservation } from '../types';

// Custom Node Components
const EvidenceNode = ({ data }: NodeProps) => (
    <div className="bg-slate-900/90 backdrop-blur-md border border-indigo-500/30 rounded-2xl p-4 min-w-[200px] shadow-[0_0_20px_rgba(99,102,241,0.1)] hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] transition-all group">
        <Handle type="source" position={Position.Right} className="!bg-indigo-500 !w-3 !h-3" />
        <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:text-white group-hover:bg-indigo-500 transition-colors">
                <i className="fas fa-archive text-xs"></i>
            </div>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">EVIDENCE</span>
        </div>
        <div className="text-white font-bold text-sm leading-tight">{data.label as string}</div>
        <div className="text-[10px] text-slate-500 mt-1 truncate">{data.subLabel as string}</div>
    </div>
);

const WitnessNode = ({ data }: NodeProps) => (
    <div className="bg-slate-900/90 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-4 min-w-[200px] shadow-[0_0_20px_rgba(16,185,129,0.1)] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all group">
        <Handle type="source" position={Position.Left} className="!bg-emerald-500 !w-3 !h-3" />
        <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:text-white group-hover:bg-emerald-500 transition-colors">
                <i className="fas fa-user-secret text-xs"></i>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">WITNESS</span>
        </div>
        <div className="text-white font-bold text-sm leading-tight">{data.label as string}</div>
        <div className="flex items-center gap-2 mt-2">
            <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${data.reliability as number}%` }}></div>
            </div>
            <span className="text-[9px] text-emerald-500 font-mono">{data.reliability as number}%</span>
        </div>
    </div>
);

const ObservationNode = ({ data }: NodeProps) => (
    <div className="bg-indigo-950/90 backdrop-blur-md border-2 border-indigo-400/50 rounded-2xl p-5 min-w-[250px] shadow-[0_0_40px_rgba(129,140,248,0.2)] hover:scale-105 transition-all relative">
        <Handle type="target" position={Position.Left} id="l" className="!bg-white !w-3 !h-3" />
        <Handle type="target" position={Position.Right} id="r" className="!bg-white !w-3 !h-3" />

        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">
            AI INSIGHT
        </div>

        <div className="text-center mt-2">
            <div className="text-white font-bold text-sm leading-relaxed mb-2">"{data.label as string}"</div>

            <div className="inline-flex items-center gap-2 bg-black/20 px-2 py-1 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
                <span className="text-[10px] text-indigo-200 font-mono">CONFIDENCE: {data.confidence as number}%</span>
            </div>
        </div>
    </div>
);

// Node Types Registry
const nodeTypes = {
    evidence: EvidenceNode,
    witness: WitnessNode,
    observation: ObservationNode,
};

interface ForensicGraphProps {
    evidence: Evidence[];
    witnesses: Witness[];
    timeline: TimelineEvent[];
    observations: AIObservation[];
    onManualConnect?: (params: Connection) => void;
}

export const ForensicGraph: React.FC<ForensicGraphProps> = ({
    evidence,
    witnesses,
    timeline,
    observations,
    onManualConnect
}) => {
    // ------------------------------------------------------------------
    // 1. Data Transformation (Memoized)
    // ------------------------------------------------------------------
    const { allNodes, allEdges } = useMemo(() => {
        let nodes: Node[] = [];
        let edges: Edge[] = [];

        // Layout Config
        const colSpacing = 400;
        const rowSpacing = 150;

        // A. Evidence Nodes (Left Column)
        evidence.forEach((e, i) => {
            nodes.push({
                id: e.id,
                type: 'evidence',
                data: { label: e.name, subLabel: e.type },
                position: { x: 0, y: i * rowSpacing },
            });
        });

        // B. Witness Nodes (Right Column)
        witnesses.forEach((w, i) => {
            nodes.push({
                id: w.id,
                type: 'witness',
                data: { label: w.name, reliability: w.reliabilityScore },
                position: { x: colSpacing * 2, y: i * rowSpacing },
            });
        });

        // C. Observation Nodes (Center Column) & Edges
        // These are the ones we want to "stream" in.
        observations.forEach((obs, i) => {
            const yPos = i * (rowSpacing + 50);

            // Node
            nodes.push({
                id: obs.id,
                type: 'observation',
                data: { label: obs.observation, confidence: obs.confidence },
                position: { x: colSpacing, y: yPos },
                hidden: true, // Start hidden!
            });

            // Edges for this observation
            obs.correlations.forEach((corr, idx) => {
                const sourceExists = evidence.some(e => e.id === corr.refId) || witnesses.some(w => w.id === corr.refId);
                if (sourceExists) {
                    edges.push({
                        id: `e-${obs.id}-${corr.refId}-${idx}`,
                        source: corr.refId,
                        target: obs.id,
                        animated: true,
                        style: { stroke: '#6366f1', strokeWidth: 2, opacity: 0.6 },
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
                        hidden: true, // Start hidden!
                    });
                }
            });
        });

        return { allNodes: nodes, allEdges: edges };
    }, [evidence, witnesses, observations]);


    // ------------------------------------------------------------------
    // 2. State for Streaming
    // ------------------------------------------------------------------
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isStreaming, setIsStreaming] = React.useState(false);

    // We need access to the ReactFlow instance to trigger fitView animations
    // but simplified, we can just let the library handle it or use a hook.
    // For auto-fitting, we can use a key prop to force re-render or a useEffect.

    // ------------------------------------------------------------------
    // 3. Streaming Effect
    // ------------------------------------------------------------------
    const startStreaming = useCallback(() => {
        if (observations.length === 0) {
            // If no observations, just show static nodes
            const staticNodes = allNodes.map(n => ({ ...n, hidden: false }));
            setNodes(staticNodes);
            setEdges([]);
            return;
        }

        setIsStreaming(true);

        // 1. Initial State: Show Evidence & Witnesses immediately
        // Hide all observations initially
        const initialVisibleNodes = allNodes.map(n => {
            if (n.type === 'evidence' || n.type === 'witness') return { ...n, hidden: false };
            return { ...n, hidden: true };
        });

        setNodes(initialVisibleNodes);
        setEdges([]); // No edges initially

        // 2. Animation Loop
        let currentIndex = 0;

        const streamNextValue = () => {
            if (currentIndex >= observations.length) {
                setIsStreaming(false);
                return;
            }

            const currentObs = observations[currentIndex];

            // Reveal this observation node
            setNodes(nds => nds.map(n => {
                if (n.id === currentObs.id) return { ...n, hidden: false };
                return n;
            }));

            // Reveal edges connected to THIS observation
            // We find edges in 'allEdges' where target is currentObs.id
            const newEdges = allEdges.filter(e => e.target === currentObs.id).map(e => ({ ...e, hidden: false }));

            setEdges(eds => [...eds, ...newEdges]);

            currentIndex++;

            // Schedule next drop
            setTimeout(streamNextValue, 1200); // 1.2s delay for dramatic effect
        };

        // Start delay
        setTimeout(streamNextValue, 1000);

    }, [allNodes, allEdges, observations, setNodes, setEdges]);


    // ------------------------------------------------------------------
    // 4. Trigger Streaming on Load or Data Change
    // ------------------------------------------------------------------
    React.useEffect(() => {
        startStreaming();
    }, [startStreaming]);


    // ------------------------------------------------------------------
    // 5. Connect Handler
    // ------------------------------------------------------------------
    const onConnect: OnConnect = useCallback(
        (params) => {
            setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#10b981', strokeWidth: 3 } }, eds));
            if (onManualConnect) {
                onManualConnect(params);
            }
        },
        [setEdges, onManualConnect],
    );

    return (
        <div className="h-[600px] w-full glass rounded-[2.5rem] overflow-hidden border border-white/5 relative bg-slate-950">
            {/* Header / Controls */}
            <div className="absolute top-6 left-8 z-10 pointers-events-none">
                <h3 className="text-white font-black text-2xl flex items-center gap-3 tracking-tighter">
                    <span className={`w-3 h-3 rounded-full ${isStreaming ? 'bg-indigo-500 animate-ping' : 'bg-emerald-500'}`}></span>
                    DETECTIVE BOARD
                </h3>
                <p className="text-slate-500 text-xs font-mono uppercase tracking-[0.3em] ml-6 mt-1 flex items-center gap-2">
                    {isStreaming ? 'ANALYSIS IN PROGRESS...' : 'VISUAL INTELLIGENCE READY'}
                </p>
            </div>

            {/* Replay Button */}
            {!isStreaming && observations.length > 0 && (
                <div className="absolute top-6 right-8 z-10">
                    <button
                        onClick={startStreaming}
                        className="bg-slate-800/80 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 backdrop-blur-md border border-white/10"
                    >
                        <i className="fas fa-play"></i> Replay Analysis
                    </button>
                </div>
            )}

            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView // This might jump around during streaming, but ensures visibility
                fitViewOptions={{ padding: 0.2, duration: 800 }} // Smooth transition
                className="bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black"
                defaultEdgeOptions={{ type: 'smoothstep' }}
                proOptions={{ hideAttribution: true }}
            >
                <Background color="#6366f1" gap={40} size={1} variant={undefined} style={{ opacity: 0.1 }} />
                <Controls
                    className="!bg-slate-900/90 !border-slate-700 !shadow-2xl !rounded-xl overflow-hidden [&>button]:!bg-slate-900/50 [&>button]:!border-b [&>button]:!border-slate-800 [&>button]:!fill-slate-400 [&>button:hover]:!fill-white [&>button:hover]:!bg-indigo-600 transition-all backdrop-blur-md"
                />
            </ReactFlow>
        </div>
    );
};
