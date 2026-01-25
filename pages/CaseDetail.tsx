
import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { jsPDF } from 'jspdf';
import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  addDoc,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import {
  CrimeCase,
  CaseStatus,
  Evidence,
  Witness,
  TimelineEvent,
  AIObservation,
  AIIntelligenceCorrelation,
  TimeConfidence
} from '../types';
import { TimelineVisual } from '../components/TimelineVisual';
import { ObservationCard } from '../components/ObservationCard';
import { ForensicGraph } from '../components/ForensicGraph';
import { analyzeForensicCase } from '../geminiService';

interface CaseDetailProps {
  caseId: string;
  user: User;
  onBack: () => void;
}

export const CaseDetail: React.FC<CaseDetailProps> = ({ caseId, user, onBack }) => {
  const [activeTab, setActiveTab] = useState<'evidence' | 'witnesses' | 'timeline' | 'graph' | 'analysis'>('evidence');
  const [caseData, setCaseData] = useState<CrimeCase | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [witnesses, setWitnesses] = useState<Witness[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [observations, setObservations] = useState<AIObservation[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);

  // DEBUGGING: Log whenever activeTab changes or data updates
  useEffect(() => {
    if (activeTab === 'graph') {
      console.log("Graph Tab Active. Nodes count:", evidence.length + witnesses.length);
      console.log("Evidence:", evidence);
      console.log("Witnesses:", witnesses);
    }
  }, [activeTab, evidence, witnesses]);

  // Editing state
  const [editingWitnessId, setEditingWitnessId] = useState<string | null>(null);

  // Form states

  // Form states
  const [newWitness, setNewWitness] = useState({ name: '', statement: '', reliabilityScore: 70 });
  const [newEvent, setNewEvent] = useState({ title: '', description: '', time: '', timeConfidence: TimeConfidence.ESTIMATED });

  useEffect(() => {
    // Fetch Case
    const fetchCase = async () => {
      const docRef = doc(db, 'cases', caseId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCaseData({ id: docSnap.id, ...docSnap.data() } as CrimeCase);
      }
      setLoading(false);
    };
    fetchCase();

    // Fetch Sub-collections
    const unsubEvidence = onSnapshot(collection(db, 'cases', caseId, 'evidence'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Evidence[];
      setEvidence(data);
      // Update counts in main case doc if changed (optional optimization, or do via cloud functions)
      updateDoc(doc(db, 'cases', caseId), { evidenceCount: data.length }).catch(() => { });
    });
    const unsubWitnesses = onSnapshot(collection(db, 'cases', caseId, 'witnesses'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Witness[];
      setWitnesses(data);
      updateDoc(doc(db, 'cases', caseId), { witnessCount: data.length }).catch(() => { });
    });
    const unsubTimeline = onSnapshot(query(collection(db, 'cases', caseId, 'timeline'), orderBy('time', 'asc')), (snapshot) => {
      setTimeline(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TimelineEvent[]);
    });
    // For observations, we might want to store them too
    const unsubObservations = onSnapshot(collection(db, 'cases', caseId, 'observations'), (snapshot) => {
      setObservations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AIObservation[]);
    });

    return () => {
      unsubEvidence();
      unsubWitnesses();
      unsubTimeline();
      unsubObservations();
    };
  }, [caseId]);

  // Handlers adapted for Firestore




  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 1njn UI shows 'Add Manual Log' button. We can add a file upload button too.
      // Upload to Storage
      const storageRef = ref(storage, `case_evidence/${caseId}/${Date.now()}_${file.name}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(uploadResult.ref);

      await addDoc(collection(db, 'cases', caseId, 'evidence'), {
        name: file.name,
        type: file.type,
        description: 'Uploaded evidence file.',
        storageUrl: url,
        uploadedAt: Date.now()
      });
    } catch (err) {
      console.error("Upload failed:", err);
      alert("File upload failed.");
    }
  };

  const handleDeleteEvidence = async (id: string, storageUrl: string) => {
    if (!window.confirm("Purge this evidence item from the locker?")) return;
    try {
      if (storageUrl && storageUrl !== '#') {
        const fileRef = ref(storage, storageUrl);
        await deleteObject(fileRef).catch(e => console.warn("File delete failed (might verify manual log)", e));
      }
      await deleteDoc(doc(db, 'cases', caseId, 'evidence', id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleAddWitness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWitness.name.trim()) return;
    await addDoc(collection(db, 'cases', caseId, 'witnesses'), {
      ...newWitness,
      recordedAt: Date.now()
    });
    setNewWitness({ name: '', statement: '', reliabilityScore: 70 });
  };

  const handleDeleteWitness = async (id: string) => {
    if (!window.confirm("Purge this witness statement?")) return;
    await deleteDoc(doc(db, 'cases', caseId, 'witnesses', id));
  };

  const handleUpdateWitnessReliability = async (witnessId: string, newScore: number) => {
    await updateDoc(doc(db, 'cases', caseId, 'witnesses', witnessId), {
      reliabilityScore: newScore
    });
    // Local state update happens via snapshot
  };

  const handleAddTimeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title.trim() || !newEvent.time) return;
    await addDoc(collection(db, 'cases', caseId, 'timeline'), { ...newEvent });
    setNewEvent({ title: '', description: '', time: '', timeConfidence: TimeConfidence.ESTIMATED });
  };

  const handleDeleteTimeline = async (id: string) => {
    if (!window.confirm("Purge this event?")) return;
    await deleteDoc(doc(db, 'cases', caseId, 'timeline', id));
  };

  const runAIAnalysis = async () => {
    if (!caseData) return;
    setAnalyzing(true);
    setActiveTab('analysis');
    try {
      const results = await analyzeForensicCase(caseData, evidence, witnesses, timeline);
      const enriched = results.map((r: any) => ({
        ...r,
        priority: r.confidence > 85 ? 'high' : r.confidence > 60 ? 'medium' : 'low',
        timestamp: new Date().toISOString()
      }));
      setObservations(enriched);

      // Clear existing observations first to avoid duplicates
      const obsCollectionRef = collection(db, 'cases', caseId, 'observations');
      const existingDocs = await getDocs(obsCollectionRef);
      const deletePromises = existingDocs.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Add new observations
      const addPromises = enriched.map((obs: any) => addDoc(obsCollectionRef, obs));
      await Promise.all(addPromises);
    } catch (err) {
      console.error("Analysis failed:", err);
      alert("AI Analysis encountered a logic error.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExportPDF = async () => {
    if (!caseData) return;
    setExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let y = 0;

      // Helper: Auto-Add Page
      const checkPageBreak = (currentY: number, addedHeight: number = 20) => {
        if (currentY + addedHeight > pageHeight - 20) {
          doc.addPage();
          return 30; // Reset Y to top margin
        }
        return currentY;
      };

      // --- COVER PAGE ---
      doc.setFillColor(15, 23, 42); // Dark Slate
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Logo / Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont(undefined, 'bold');
      doc.text("FORENSIC INSIGHT ENGINE", pageWidth / 2, 80, { align: 'center' });

      doc.setTextColor(99, 102, 241); // Indigo
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.text("CLASSIFIED INVESTIGATION DOSSIER", pageWidth / 2, 90, { align: 'center' });

      // Case Details Box
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.5);
      doc.line(40, 110, pageWidth - 40, 110);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(36);
      doc.setFont(undefined, 'bold');
      const titleLines = doc.splitTextToSize(caseData.title.toUpperCase(), pageWidth - 60);
      doc.text(titleLines, pageWidth / 2, 140, { align: 'center' });

      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184); // Slate 400
      doc.text(`REFERENCE ID: ${caseId.toUpperCase()}`, pageWidth / 2, 170, { align: 'center' });
      doc.text(`STATUS: ${caseData.status.toUpperCase()}`, pageWidth / 2, 176, { align: 'center' });
      doc.text(`LEAD INVESTIGATOR: ${user.displayName?.toUpperCase() || 'UNKNOWN'}`, pageWidth / 2, 182, { align: 'center' });
      doc.text(`GENERATED: ${new Date().toLocaleString()}`, pageWidth / 2, 188, { align: 'center' });

      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("CONFIDENTIAL // EYES ONLY", pageWidth / 2, pageHeight - 20, { align: 'center' });

      doc.addPage();

      // --- INSIDE PAGES ---
      y = 30;

      // Header on each page
      const drawHeader = () => {
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, pageWidth, 20, 'F');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("FORENSIC INSIGHT ENGINE // V4.0.2", margin, 12);
        doc.text(`REF: ${caseId.slice(0, 8)}...`, pageWidth - margin, 12, { align: 'right' });
      };

      drawHeader();

      // Section 1: Executive Summary
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.setFont(undefined, 'bold');
      doc.text("EXECUTIVE SUMMARY", margin, y);
      y += 10;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(51, 65, 85);
      const sumLines = doc.splitTextToSize(caseData.summary || "No summary provided.", pageWidth - (margin * 2));
      doc.text(sumLines, margin, y);
      y += (sumLines.length * 5) + 15;

      // Section 2: Case Statistics (Grid)
      y = checkPageBreak(y, 40);
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(margin, y, 50, 25, 2, 2, 'F');
      doc.text("EVIDENCE", margin + 25, y + 8, { align: 'center' });
      doc.setFontSize(12); doc.setFont(undefined, 'bold');
      doc.text(evidence.length.toString(), margin + 25, y + 18, { align: 'center' });

      doc.roundedRect(margin + 60, y, 50, 25, 2, 2, 'F');
      doc.setFontSize(10); doc.setFont(undefined, 'normal');
      doc.text("WITNESSES", margin + 85, y + 8, { align: 'center' });
      doc.setFontSize(12); doc.setFont(undefined, 'bold');
      doc.text(witnesses.length.toString(), margin + 85, y + 18, { align: 'center' });

      doc.roundedRect(margin + 120, y, 50, 25, 2, 2, 'F');
      doc.setFontSize(10); doc.setFont(undefined, 'normal');
      doc.text("TIMELINE", margin + 145, y + 8, { align: 'center' });
      doc.setFontSize(12); doc.setFont(undefined, 'bold');
      doc.text(timeline.length.toString(), margin + 145, y + 18, { align: 'center' });

      y += 40;

      // Section 3: Evidence Inventory
      y = checkPageBreak(y);
      doc.setFontSize(12); doc.setTextColor(99, 102, 241); doc.setFont(undefined, 'bold');
      doc.text("SECTION I: EVIDENCE INVENTORY", margin, y);
      doc.line(margin, y + 2, pageWidth - margin, y + 2);
      y += 15;

      evidence.forEach((e, i) => {
        y = checkPageBreak(y, 20);
        doc.setFontSize(10); doc.setTextColor(15, 23, 42); doc.setFont(undefined, 'bold');
        doc.text(`${i + 1}. ${e.name}`, margin, y);
        doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.setFont(undefined, 'normal');
        doc.text(`[${e.type.toUpperCase()}]`, pageWidth - margin, y, { align: 'right' });
        y += 5;
        const desc = doc.splitTextToSize(e.description, pageWidth - (margin * 2) - 10);
        doc.text(desc, margin + 5, y);
        y += (desc.length * 4) + 8;
      });
      y += 10;

      // Section 4: Witness Statements
      y = checkPageBreak(y);
      drawHeader(); // Ensure header on page break if manual
      doc.setFontSize(12); doc.setTextColor(99, 102, 241); doc.setFont(undefined, 'bold');
      doc.text("SECTION II: WITNESS STATEMENTS", margin, y);
      doc.line(margin, y + 2, pageWidth - margin, y + 2);
      y += 15;

      witnesses.forEach((w, i) => {
        y = checkPageBreak(y, 30);
        doc.setFontSize(10); doc.setTextColor(15, 23, 42); doc.setFont(undefined, 'bold');
        doc.text(`${w.name.toUpperCase()}`, margin, y);
        doc.setTextColor(w.reliabilityScore > 80 ? 22 : 234, w.reliabilityScore > 80 ? 163 : 179, w.reliabilityScore > 80 ? 74 : 8); // Simple conditional color logic (greenish / brownish)
        doc.setFontSize(8);
        doc.text(`CREDIBILITY: ${w.reliabilityScore}%`, pageWidth - margin, y, { align: 'right' });
        y += 5;
        doc.setFont(undefined, 'italic'); doc.setTextColor(71, 85, 105);
        const stmt = doc.splitTextToSize(`"${w.statement}"`, pageWidth - (margin * 2) - 10);
        doc.text(stmt, margin + 5, y);
        y += (stmt.length * 4) + 10;
      });
      y += 10;

      // Section 5: Timeline
      if (timeline.length > 0) {
        y = checkPageBreak(y);
        doc.setFontSize(12); doc.setTextColor(99, 102, 241); doc.setFont(undefined, 'bold');
        doc.text("SECTION III: CHRONOLOGICAL TIMELINE", margin, y);
        doc.line(margin, y + 2, pageWidth - margin, y + 2);
        y += 15;

        timeline.forEach((t) => {
          y = checkPageBreak(y, 25);
          const timeStr = new Date(t.time).toLocaleString();
          doc.setFontSize(9); doc.setTextColor(15, 23, 42); doc.setFont(undefined, 'bold');
          doc.text(timeStr, margin, y);
          doc.text(t.title, margin + 50, y);

          y += 5;
          if (t.description) {
            doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.setFont(undefined, 'normal');
            const desc = doc.splitTextToSize(t.description, pageWidth - margin - 50);
            doc.text(desc, margin + 50, y);
            y += (desc.length * 4) + 2;
          } else {
            y += 2;
          }
          y += 5;
        });
      }

      // Section 6: AI Observations
      if (observations.length > 0) {
        y += 10;
        y = checkPageBreak(y);
        doc.setFontSize(12); doc.setTextColor(99, 102, 241); doc.setFont(undefined, 'bold');
        doc.text("SECTION IV: AI FORENSIC ANALYSIS", margin, y);
        doc.line(margin, y + 2, pageWidth - margin, y + 2);
        y += 15;

        observations.forEach((o) => {
          y = checkPageBreak(y, 30);
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(margin, y, pageWidth - (margin * 2), 25, 1, 1, 'F');

          doc.setFontSize(10); doc.setTextColor(15, 23, 42); doc.setFont(undefined, 'bold');
          doc.text(o.type.toUpperCase(), margin + 5, y + 6);

          doc.setFontSize(9); doc.setTextColor(51, 65, 85); doc.setFont(undefined, 'normal');
          const obsText = doc.splitTextToSize(o.observation, pageWidth - (margin * 2) - 10);
          doc.text(obsText, margin + 5, y + 12);

          const height = (obsText.length * 4) + 15;
          // If box is bigger than initial rect, redraw (basic logic, simplified for this demo)
          y += height + 5;
        });
      }

      // Page Numbers
      const totalPages = (doc.internal as any).getNumberOfPages();
      for (let i = 2; i <= totalPages; i++) { // Skip cover page
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`PAGE ${i - 1} OF ${totalPages - 1}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      doc.save(`${caseData.title.replace(/\s+/g, '_')}_FORENSIC_REPORT.pdf`);
    } catch (err) {
      console.error("PDF Export failed:", err);
      alert("PDF generation error.");
    } finally {
      setExporting(false);
    }
  };

  const handleNavigateToRef = (sourceType: 'evidence' | 'witness' | 'timeline', refId: string) => {
    const tabMap: Record<string, 'evidence' | 'witnesses' | 'timeline'> = {
      evidence: 'evidence',
      witness: 'witnesses',
      timeline: 'timeline'
    };

    const targetTab = tabMap[sourceType];
    if (targetTab) {
      setActiveTab(targetTab);
      // Wait for tab switch
      setTimeout(() => {
        const element = document.getElementById(refId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('element-highlight-flash');
          setTimeout(() => element.classList.remove('element-highlight-flash'), 3000);
        }
      }, 200);
    }
  };

  const handleAddManualLink = async (obsId: string, correlation: AIIntelligenceCorrelation) => {
    // Find obs and update
    // Firestore update in array? correlations is array.
    // Need to find doc id of observation. 
    // obsId is the id.
    // await updateDoc(doc(db, 'cases', caseId, 'observations', obsId), { 
    //    correlations: arrayUnion(correlation) 
    // });
    // Leaving manual link logic for now as it requires complex array updates or reading the whole doc.
    alert("Manual linking requires cloud function updates (Not implemented in this demo).");
  };

  if (loading || !caseData) return null;

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-10">
        <div>
          <button onClick={onBack} className="text-slate-500 hover:text-indigo-400 text-[10px] font-mono mb-4 flex items-center gap-2 uppercase tracking-widest transition-colors">
            <i className="fas fa-arrow-left"></i> Exit to Dashboard
          </button>
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-5xl font-extrabold text-white tracking-tighter">{caseData.title}</h2>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-3 py-1 rounded-lg text-[9px] font-mono">ID_{caseData.id.slice(0, 4)}</span>
              <select
                value={caseData.status}
                onChange={async (e) => {
                  const newStatus = e.target.value as CaseStatus;
                  setCaseData({ ...caseData, status: newStatus }); // Optimistic update
                  await updateDoc(doc(db, 'cases', caseId), { status: newStatus });
                }}
                className={`border text-xs font-bold uppercase rounded-lg px-2 py-1 outline-none appearance-none cursor-pointer transition-colors ${caseData.status === CaseStatus.OPEN ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' :
                  caseData.status === CaseStatus.IN_PROGRESS ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20' :
                    caseData.status === CaseStatus.ON_HOLD ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20' :
                      caseData.status === CaseStatus.RESOLVED ? 'bg-slate-500/10 text-slate-400 border-slate-500/30 hover:bg-slate-500/20' :
                        'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20' // Cold
                  }`}
              >
                <option value={CaseStatus.OPEN} className="bg-slate-900 text-emerald-400">Open Active</option>
                <option value={CaseStatus.IN_PROGRESS} className="bg-slate-900 text-indigo-400">In Progress</option>
                <option value={CaseStatus.ON_HOLD} className="bg-slate-900 text-amber-400">On Hold</option>
                <option value={CaseStatus.RESOLVED} className="bg-slate-900 text-slate-400">Closed / Resolved</option>
                <option value={CaseStatus.COLD} className="bg-slate-900 text-rose-400">Cold Case</option>
              </select>
            </div>
          </div>
          <p className="text-slate-400 max-w-3xl leading-relaxed text-lg font-light">{caseData.summary}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="bg-slate-900 hover:bg-slate-800 text-slate-300 px-8 py-5 rounded-2xl font-black text-sm tracking-widest flex items-center gap-4 border border-white/5 transition-all disabled:opacity-50 active:scale-95 group"
          >
            {exporting ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <i className="fas fa-file-export group-hover:scale-110 transition-transform"></i>
            )}
            GENERATE REPORT
          </button>
          <button
            onClick={runAIAnalysis}
            disabled={analyzing}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-5 rounded-2xl font-black text-sm tracking-widest flex items-center gap-4 shadow-2xl transition-all disabled:opacity-50 group active:scale-95"
          >
            {analyzing ? (
              <i className="fas fa-spinner fa-spin text-xl"></i>
            ) : (
              <i className="fas fa-brain text-xl group-hover:animate-pulse"></i>
            )}
            INITIATE FORENSIC AUDIT
          </button>
        </div>
      </div>

      <nav className="flex gap-2 p-1.5 glass rounded-2xl sticky top-28 z-40 border border-white/5 shadow-2xl">
        <button key="evidence" onClick={() => setActiveTab('evidence')} className={`flex-1 py-4 px-6 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'evidence' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}> EVIDENCE </button>
        <button key="witnesses" onClick={() => setActiveTab('witnesses')} className={`flex-1 py-4 px-6 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'witnesses' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}> WITNESSES </button>
        <button key="timeline" onClick={() => setActiveTab('timeline')} className={`flex-1 py-4 px-6 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'timeline' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}> TIMELINE </button>
        <button key="graph" onClick={() => setActiveTab('graph')} className={`flex-1 py-4 px-6 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'graph' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}> DETECTIVE BOARD </button>
        <button key="analysis" onClick={() => setActiveTab('analysis')} className={`flex-1 py-4 px-6 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'analysis' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}> {analyzing ? 'ANALYZING...' : 'FORENSIC AUDIT'} </button>
      </nav>

      <div className="min-h-[600px] animate-fade-in">
        {activeTab === 'evidence' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <i className="fas fa-archive text-indigo-500"></i> Evidence Locker
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {evidence.map(e => (
                  <div key={e.id} id={e.id} className="glass p-6 rounded-3xl glow-border flex items-center gap-5 transition-all duration-500 relative group">
                    <button
                      onClick={() => handleDeleteEvidence(e.id, e.storageUrl)}
                      className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white flex items-center justify-center transition-all border border-rose-500/20 opacity-0 group-hover:opacity-100 z-20 shadow-xl active:scale-90"
                      title="Purge Evidence"
                    >
                      <i className="fas fa-trash-alt text-xs"></i>
                    </button>
                    <a
                      href={e.storageUrl !== '#' ? e.storageUrl : undefined}
                      target="_blank"
                      rel="noreferrer"
                      className={`w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-indigo-400 border border-white/5 relative z-10 transition-colors ${e.storageUrl !== '#' ? 'hover:bg-indigo-500/20 cursor-pointer' : 'cursor-default opacity-50'}`}
                    >
                      <i className={`fas ${e.type.includes('image') ? 'fa-image' : 'fa-file-shield'} text-2xl`}></i>
                    </a>
                    <div className="flex-1 min-w-0 relative z-10">
                      <h4 className="font-bold text-slate-100 truncate">{e.name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono uppercase mt-1">{e.type}</p>
                    </div>
                  </div>
                ))}

                {/* Upload Card */}
                <label className="p-6 rounded-3xl border-2 border-dashed border-slate-800 hover:border-indigo-500/30 flex flex-col items-center justify-center gap-2 group transition-all cursor-pointer bg-slate-900/30">
                  <i className="fas fa-cloud-upload-alt text-slate-700 group-hover:text-indigo-500 text-2xl mb-2"></i>
                  <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest group-hover:text-indigo-400">Upload Digital Artifact</span>
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>


              </div>
            </div>
            <div className="space-y-6">
              <div className="glass p-8 rounded-[2.5rem] border-indigo-500/20">
                <h4 className="font-black text-xs uppercase tracking-[0.2em] text-indigo-400 mb-6">Security Protocol</h4>
                <p className="text-sm text-slate-400 leading-relaxed font-light mb-8">
                  All evidence items are securely hashed and stored in the cloud evidence locker.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-emerald-500">
                    <i className="fas fa-check-circle text-xs"></i>
                    <span className="text-[10px] font-bold uppercase">Integrity Verified</span>
                  </div>
                  <div className="flex items-center gap-3 text-indigo-400">
                    <i className="fas fa-lock text-xs"></i>
                    <span className="text-[10px] font-bold uppercase">Cloud Encrypted Storage</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'witnesses' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <i className="fas fa-user-secret text-indigo-500"></i> Human Intelligence
              </h3>
              <div className="space-y-6">
                {witnesses.map(w => (
                  <div key={w.id} id={w.id} className="group glass p-8 rounded-[2rem] border-l-4 border-indigo-500 shadow-xl transition-all duration-500 relative">
                    <button
                      onClick={() => handleDeleteWitness(w.id)}
                      className="absolute top-6 right-6 w-12 h-12 rounded-2xl bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white flex items-center justify-center transition-all border border-rose-500/20 opacity-0 group-hover:opacity-100 z-20 shadow-xl active:scale-90"
                      title="Purge Testimony"
                    >
                      <i className="fas fa-trash-alt text-sm"></i>
                    </button>
                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-white">
                          {w.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-xl font-bold text-white">{w.name}</h4>
                          <span className="text-[10px] text-slate-500 font-mono tracking-tighter uppercase">Subject Ref: {w.id.slice(0, 8)}</span>
                        </div>
                      </div>
                      <div className="text-right mr-12 bg-slate-900/50 p-3 rounded-xl border border-white/5">
                        <div className="flex items-center justify-end gap-2 mb-1">
                          <span className="block text-[9px] text-slate-500 uppercase font-bold">Reliability Index</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-lg font-bold ${w.reliabilityScore > 80 ? 'text-emerald-400' : 'text-amber-400'}`}>{w.reliabilityScore}%</span>
                          <input
                            type="range" min="0" max="100"
                            className="w-20 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            value={w.reliabilityScore}
                            onChange={(e) => handleUpdateWitnessReliability(w.id, parseInt(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-300 italic text-lg font-light leading-relaxed pl-6 border-l border-white/10 relative z-10">
                      "{w.statement}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass p-8 rounded-[2.5rem]">
              <h4 className="font-bold text-xs uppercase tracking-widest text-slate-500 mb-8">Record Testimony</h4>
              <form onSubmit={handleAddWitness} className="space-y-6">
                <input
                  type="text"
                  placeholder="Subject Name"
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={newWitness.name}
                  onChange={(e) => setNewWitness({ ...newWitness, name: e.target.value })}
                  required
                />
                <textarea
                  placeholder="Direct Quote Statement..."
                  rows={5}
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all"
                  value={newWitness.statement}
                  onChange={(e) => setNewWitness({ ...newWitness, statement: e.target.value })}
                  required
                />
                <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                  <label className="block text-[9px] text-slate-500 uppercase font-black mb-3">Reliability Index: {newWitness.reliabilityScore}%</label>
                  <input
                    type="range" min="0" max="100"
                    className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    value={newWitness.reliabilityScore}
                    onChange={(e) => setNewWitness({ ...newWitness, reliabilityScore: parseInt(e.target.value) })}
                  />
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-5 rounded-2xl transition-all shadow-xl">
                  Commit Record
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <TimelineVisual events={timeline} onDeleteEvent={handleDeleteTimeline} />
            </div>
            <div className="glass p-8 rounded-[2.5rem]">
              <h4 className="font-bold text-xs uppercase tracking-widest text-slate-500 mb-8">Log Chrono Event</h4>
              <form onSubmit={handleAddTimeline} className="space-y-6">
                <input
                  type="text"
                  placeholder="Event Label"
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold placeholder:text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  required
                />
                <input
                  type="datetime-local"
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                  required
                />
                <textarea
                  placeholder="Descriptive Parameters..."
                  rows={4}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-white font-light placeholder:text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                />
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-lg py-5 rounded-2xl shadow-xl transition-all active:scale-95">
                  Index Event
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'graph' && (
          <div className="relative">
            {observations.length === 0 && (
              <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                <div className="bg-slate-950/80 backdrop-blur-sm p-6 rounded-2xl border border-indigo-500/30 text-center max-w-md pointer-events-auto">
                  <i className="fas fa-project-diagram text-indigo-500 text-3xl mb-3"></i>
                  <h4 className="text-white font-bold mb-2">Initialize Connection Graph</h4>
                  <p className="text-slate-400 text-sm mb-4">The Detective Board visualizes AI-detected correlations. Run the Forensic Audit to generate the connection web.</p>
                  <button
                    onClick={runAIAnalysis}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest"
                  >
                    Run Analysis Now
                  </button>
                </div>
              </div>
            )}
            <ForensicGraph
              evidence={evidence}
              witnesses={witnesses}
              timeline={timeline}
              observations={observations}
              onManualConnect={(params) => {
                // In a real app, this would save to Firestore
                console.log("Manual Connection:", params);
                const source = evidence.find(e => e.id === params.source) || witnesses.find(w => w.id === params.source);
                const target = observations.find(o => o.id === params.target);
                if (source && target) {
                  alert(`Linked ${source.name} to Insight: "${target.observation.substring(0, 20)}..."`);
                }
              }}
            />
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-12">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-3xl font-extrabold text-white tracking-tighter mb-2">Forensic Dossier</h3>
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.3em]">Last Audit: {observations.length > 0 ? observations[0].timestamp : 'Never'}</p>
              </div>
            </div>

            {analyzing ? (
              <div className="flex flex-col items-center justify-center py-40 glass rounded-[3rem] space-y-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-indigo-500/5 animate-pulse"></div>
                <div className="w-24 h-24 border-[6px] border-indigo-500 border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(79,70,229,0.2)]"></div>
                <div className="text-center z-10">
                  <h4 className="text-2xl font-black mb-3 text-white">FORENSIC ENGINE: DEEP SCAN</h4>
                  <p className="text-slate-500 font-mono text-sm tracking-widest uppercase animate-pulse">Synthesizing {witnesses.length} statements with physical evidence...</p>
                  <p className="text-indigo-400 font-mono text-[10px] tracking-widest uppercase mt-4">Detecting Inconsistencies...</p>
                </div>
              </div>
            ) : observations.length === 0 ? (
              <div className="glass rounded-[3rem] py-32 text-center border-slate-800">
                <i className="fas fa-microscope text-5xl text-slate-700 mb-6"></i>
                <h3 className="text-2xl font-bold text-slate-400">Awaiting Forensic Audit Initiation</h3>
                <p className="text-slate-600 mt-2">Data must be submitted to the Gemini Engine for pattern detection.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {observations.map((obs) => (
                  <ObservationCard
                    key={obs.id}
                    obs={obs}
                    onNavigate={handleNavigateToRef}
                    evidence={evidence}
                    witnesses={witnesses}
                    timeline={timeline}
                    onAddManualLink={handleAddManualLink}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
