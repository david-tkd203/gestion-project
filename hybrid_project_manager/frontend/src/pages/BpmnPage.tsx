import { useEffect, useRef, useState } from 'react';
import { DiagramIcon, Upload, Loader2, FileText } from '../icons';

export default function BpmnPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    // Dynamically import bpmn-js (large lib)
    const initViewer = async () => {
      try {
        const BpmnJS = (await import('bpmn-js')).default;
        if (containerRef.current && !viewerRef.current) {
          viewerRef.current = new BpmnJS({ container: containerRef.current });
        }
      } catch (e) {
        console.error('bpmn-js init error:', e);
      }
    };
    initViewer();
    return () => {
      if (viewerRef.current) {
        try { viewerRef.current.destroy(); } catch {}
        viewerRef.current = null;
      }
    };
  }, []);

  const loadBpmn = async (file: File) => {
    if (!viewerRef.current) return;
    setError('');
    setLoaded(false);
    setFileName(file.name);

    try {
      const text = await file.text();
      await viewerRef.current.importXML(text);
      setLoaded(true);
      // Zoom to fit
      const canvas = viewerRef.current.get('canvas');
      canvas.zoom('fit-viewport');
    } catch (e: any) {
      setError(e.message || 'Error al cargar el diagrama BPMN');
      console.error(e);
    }
  };

  const loadSample = async () => {
    if (!viewerRef.current) return;
    setError('');
    setFileName('');
    const sample = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="Process_1" isExecutable="false">
    <startEvent id="StartEvent_1" name="Inicio Carga"/>
    <task id="Task_1" name="Subir Excel VINCULOsync" />
    <task id="Task_2" name="Parsear hojas y columnas" />
    <task id="Task_3" name="Construir grafo de dependencias" />
    <task id="Task_4" name="Calcular fechas Gantt" />
    <task id="Task_5" name="Detectar participantes" />
    <task id="Task_6" name="Asignar tareas a usuarios" />
    <endEvent id="EndEvent_1" name="Proyecto listo" />
    <sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
    <sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Task_2" />
    <sequenceFlow id="Flow_3" sourceRef="Task_2" targetRef="Task_3" />
    <sequenceFlow id="Flow_4" sourceRef="Task_3" targetRef="Task_4" />
    <sequenceFlow id="Flow_5" sourceRef="Task_4" targetRef="Task_5" />
    <sequenceFlow id="Flow_6" sourceRef="Task_5" targetRef="Task_6" />
    <sequenceFlow id="Flow_7" sourceRef="Task_6" targetRef="EndEvent_1" />
  </process>
  <bpmndi:BPMNDiagram id="BpmnDiagram_1">
    <bpmndi:BPMNPlane id="BpmnPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1"><dc:Bounds x="50" y="130" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1"><dc:Bounds x="140" y="112" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_2_di" bpmnElement="Task_2"><dc:Bounds x="300" y="112" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_3_di" bpmnElement="Task_3"><dc:Bounds x="460" y="112" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_4_di" bpmnElement="Task_4"><dc:Bounds x="620" y="112" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_5_di" bpmnElement="Task_5"><dc:Bounds x="780" y="112" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_6_di" bpmnElement="Task_6"><dc:Bounds x="940" y="112" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1"><dc:Bounds x="1100" y="130" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="86" y="148" /><di:waypoint x="140" y="152" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="240" y="152" /><di:waypoint x="300" y="152" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3"><di:waypoint x="400" y="152" /><di:waypoint x="460" y="152" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4"><di:waypoint x="560" y="152" /><di:waypoint x="620" y="152" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5"><di:waypoint x="720" y="152" /><di:waypoint x="780" y="152" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6"><di:waypoint x="880" y="152" /><di:waypoint x="940" y="152" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_7_di" bpmnElement="Flow_7"><di:waypoint x="1040" y="152" /><di:waypoint x="1100" y="148" /></bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;
    try {
      await viewerRef.current.importXML(sample);
      setLoaded(true);
      const canvas = viewerRef.current.get('canvas');
      canvas.zoom('fit-viewport');
    } catch (e: any) {
      setError(e.message || 'Error');
    }
  };

  const downloadSvg = async () => {
    if (!viewerRef.current) return;
    try {
      const canvas = viewerRef.current.get('canvas');
      const svg = canvas.getSVG();
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName ? fileName.replace(/\.[^.]+$/, '.svg') : 'diagrama.svg';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h2>Diagramas BPMN</h2><p>Visualiza y analiza diagramas de flujo de procesos BPMN 2.0</p></div>
      </div>

      <div className="bpmn-toolbar">
        <button className="btn-primary" onClick={() => document.getElementById('bpmn-file-input')?.click()}>
          <Upload /> Cargar BPMN
        </button>
        <input id="bpmn-file-input" type="file" accept=".bpmn,.xml" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) loadBpmn(f); }} />
        <button className="btn-ghost" onClick={loadSample}>
          <FileText /> Cargar ejemplo
        </button>
        {loaded && (
          <button className="btn-ghost" onClick={downloadSvg}>
            <DiagramIcon /> Exportar SVG
          </button>
        )}
        <span style={{ flex: 1 }} />
        {fileName && <span style={{ fontSize: 12, color: 'var(--text2)' }}>{fileName}</span>}
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 13, color: 'var(--red)' }}>
          {error}
        </div>
      )}

      {!loaded && !error && (
        <div className="bento-cell" style={{ textAlign: 'center', padding: 60 }}>
          <DiagramIcon />
          <div style={{ marginTop: 12, color: 'var(--text2)', fontSize: 14 }}>
            Carga un archivo BPMN 2.0 o usa el ejemplo para visualizar el diagrama de flujo del proceso de importacion.
          </div>
        </div>
      )}

      <div className="bpmn-container" ref={containerRef} style={{ display: loaded ? 'block' : 'none' }} />
    </div>
  );
}
