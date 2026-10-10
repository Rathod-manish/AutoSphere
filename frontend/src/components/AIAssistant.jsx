import { Bot, Mic, Send, Sparkles, X, Activity, ShieldAlert, CalendarClock, IndianRupee, Brain, Wrench, Stethoscope, FileText, LoaderCircle, Gauge } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'

function localAnswer(question, vehicle, reminder, records) {
  const q = question.toLowerCase()
  if (!vehicle) return 'Choose a vehicle and I will build the answer around it.'
  const spend = records.reduce((sum, r) => sum + Number(r.cost || 0), 0)
  const latest = records[0]
  if (q.includes('next') || q.includes('due') || q.includes('service')) return reminder ? `${vehicle.brand} ${vehicle.model} is currently ${String(reminder.status || 'scheduled').replaceAll('_', ' ').toLowerCase()}. Next service: ${reminder.nextServiceDate || 'not set'}.` : 'Your next-service date is not available yet. Add a service record to create the timeline.'
  if (q.includes('last')) return latest ? `Last recorded service: ${latest.serviceType} on ${latest.serviceDate} at ${Number(latest.mileage || 0).toLocaleString()} km.` : 'There is no logged service history yet.'
  if (q.includes('cost') || q.includes('spent')) return `Recorded spend for this vehicle is ₹${spend.toLocaleString('en-IN')}.`
  if (q.includes('mileage') || q.includes('km')) return `Current odometer: ${Number(vehicle.currentMileage || 0).toLocaleString()} km.`
  return `I have context for ${vehicle.brand} ${vehicle.model}, including mileage and service history. Ask me about prediction, symptoms, maintenance, tyres, engine, cost or a service summary.`
}

const MODES = {
  prediction: { mode:'SERVICE_PREDICTION', icon:CalendarClock, label:'Predict next service', starter:'Predict my next service window from my history and mileage.' },
  symptom: { mode:'SYMPTOM_ANALYSIS', icon:Stethoscope, label:'Analyze a symptom', starter:'Help me analyze a vehicle symptom and tell me what should be inspected first.' },
  recommendations: { mode:'CHAT', icon:Wrench, label:'Maintenance plan', starter:'Build a practical maintenance plan for this vehicle from my current data.' },
  summary: { mode:'SERVICE_SUMMARY', icon:FileText, label:'Generate summary', starter:'Create a clear natural-language summary of my vehicle health and service history.' },
}

export default function AIAssistant({ vehicle, reminder, records, initialPrompt = '', onClose }) {
  const [messages, setMessages] = useState([{ role:'assistant', text:'AutoSphere AI is online. I use your authenticated vehicle record and service history as the source of truth.' }])
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [aiPowered, setAiPowered] = useState(null)
  const suggestions = useMemo(() => Object.values(MODES), [])

  async function send(text=input, mode='CHAT') {
    const question=text.trim(); if(!question || !vehicle?.id || busy) return
    setMessages((prev)=>[...prev,{role:'user',text:question}]); setInput(''); setBusy(true)
    try{
      const response=await api.assistant({vehicleId:vehicle.id,question,mode})
      setAiPowered(Boolean(response?.aiPowered))
      const reply=response?.reply || 'I could not generate an answer right now.'
      setMessages((prev)=>[...prev,{role:'assistant',text:reply}])
    }catch{
      setAiPowered(false)
      setMessages((prev)=>[...prev,{role:'assistant',text:localAnswer(question,vehicle,reminder,records)}])
    }finally{setBusy(false)}
  }

  function startVoice(){
    const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition
    if(!SpeechRecognition)return
    const recognition=new SpeechRecognition(); recognition.lang='en-IN'; recognition.interimResults=false; setListening(true)
    recognition.onresult=(event)=>setInput(event.results?.[0]?.[0]?.transcript||'')
    recognition.onend=()=>setListening(false); recognition.onerror=()=>setListening(false); recognition.start()
  }
  useEffect(()=>{ if(initialPrompt && vehicle?.id) send(initialPrompt,'SYMPTOM_ANALYSIS') },[initialPrompt,vehicle?.id])
  useEffect(()=>()=>setListening(false),[])

  return <aside className="assistant-panel glass-card">
    <div className="assistant-header"><div className="assistant-title"><span className="ai-orb"><Sparkles size={17}/></span><div><strong>AutoSphere AI</strong><span>Real vehicle intelligence</span></div></div><button className="icon-button" onClick={onClose}><X size={18}/></button></div>
    <div className="assistant-context"><Bot size={14}/> {vehicle ? `${vehicle.brand} ${vehicle.model} · ${vehicle.vehicleNumber}` : 'Choose a vehicle'}</div>
    <div className="ai-scan-row"><span><Brain size={14}/> {aiPowered===true?'Live AI':'Context engine'}</span><span><Activity size={14}/> Vehicle data</span><span><CalendarClock size={14}/> Timeline</span><span><ShieldAlert size={14}/> Safety-first</span><span><IndianRupee size={14}/> Spend</span></div>
    <div className="assistant-messages">{messages.map((m,i)=><div key={i} className={`chat-bubble ${m.role}`}>{m.text}</div>)}{busy&&<div className="chat-bubble assistant ai-thinking"><LoaderCircle size={15}/> Thinking from your vehicle history…</div>}</div>
    <div className="assistant-suggestions">{suggestions.map((s)=>{const Icon=s.icon;return <button key={s.mode} disabled={busy} onClick={()=>send(s.starter,s.mode)}><Icon size={14}/>{s.label}</button>})}</div>
    <div className="assistant-input"><button className={`icon-button ${listening?'voice-live':''}`} onClick={startVoice} title="Voice input"><Mic size={16}/></button><input value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>e.key==='Enter'&&send()} placeholder="Ask about your car or bike…" /><button className="icon-button filled" disabled={busy} onClick={()=>send()}>{busy?<LoaderCircle size={16}/>:<Send size={16}/>}</button></div>
    <div className="ai-foot-note"><Gauge size={14}/> Answers are based on recorded data plus AI reasoning. For safety-critical faults, get a qualified technician to inspect the vehicle.</div>
  </aside>
}
