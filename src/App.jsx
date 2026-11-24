import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownLeft, ArrowUpRight, CalendarDays, Check, ChevronLeft, Clock3, Edit3, Plus, Wallet, X, Trash2, Play, Square, TrendingUp, BriefcaseBusiness, FileText, Settings2, Moon, Sun, Monitor } from 'lucide-react';
import { loadState, saveState } from './lib/db';
import { calculatePay, durationMinutes, faDate, faTime, formatDuration, inRange, startOfWeek, toman } from './lib/finance';
import ThemeSelector from './components/ThemeSelector.jsx';

// Initialize theme immediately to prevent flash
(function initTheme() {
  const savedTheme = localStorage.getItem('karman-theme');
  const isSystem = !savedTheme || savedTheme === 'system';
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const actualTheme = isSystem ? (prefersDark ? 'dark' : 'light') : savedTheme;
  document.documentElement.className = '';
  document.documentElement.classList.add(actualTheme);
})();

const initialState = { hourlyRate: 50000, activeStart: null, pendingSession: null, sessions: [], transactions: [] };
const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

function App() {
  const [data, setData] = useState(initialState);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState('home');
  const [now, setNow] = useState(Date.now());
  const [period, setPeriod] = useState('month');
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('karman-theme') || 'system');

  // Apply theme to document root
  useEffect(() => {
    const isSystem = theme === 'system';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const actualTheme = isSystem ? (prefersDark ? 'dark' : 'light') : theme;
    document.documentElement.className = '';
    document.documentElement.classList.add(actualTheme);
    localStorage.setItem('karman-theme', theme);
  }, [theme]);

  // Watch for system preference changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const actualTheme = mediaQuery.matches ? 'dark' : 'light';
      document.documentElement.className = '';
      document.documentElement.classList.add(actualTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  useEffect(() => { loadState().then(saved => { if (saved) setData({ ...initialState, ...saved }); }).catch(() => notify('ذخیره‌سازی در این مرورگر در دسترس نیست')).finally(() => setReady(true)); }, []);
  useEffect(() => { if (!ready) return; saveState(data).catch(() => notify('ذخیره اطلاعات ناموفق بود')); }, [data, ready]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 2600); return () => clearTimeout(timer); }, [toast]);
  function notify(message) { setToast(message); }

  const walletBalance = useMemo(() => {
    const work = data.sessions.filter(s => s.status === 'confirmed').reduce((sum, s) => sum + Number(s.amount || 0), 0);
    const other = data.transactions.reduce((sum, t) => sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
    return work + other;
  }, [data]);
  const range = useMemo(() => {
    const end = new Date(); end.setHours(23,59,59,999);
    let start = new Date();
    if (period === 'week') start = startOfWeek(new Date());
    else if (period === 'month') start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    else start = new Date(0);
    return { start, end };
  }, [period, now]);
  const periodTotals = useMemo(() => {
    const sessions = data.sessions.filter(s => s.status === 'confirmed' && inRange(s.end, range.start, range.end));
    const txs = data.transactions.filter(t => inRange(t.date, range.start, range.end));
    const income = sessions.reduce((a,s) => a + Number(s.amount), 0) + txs.filter(t=>t.type==='income').reduce((a,t)=>a+Number(t.amount),0);
    const expenses = txs.filter(t=>t.type==='expense').reduce((a,t)=>a+Number(t.amount),0);
    return { income, expenses, net: income - expenses };
  }, [data, range]);

  function startWork() {
    if (data.pendingSession) return notify('ابتدا نوبت کاری در انتظار تأیید را تعیین تکلیف کن');
    setData(d => ({ ...d, activeStart: new Date().toISOString() }));
    notify('زمان کار شروع شد');
  }
  function endWork() {
    if (!data.activeStart) return;
    const end = new Date().toISOString();
    setData(d => ({ ...d, activeStart: null, pendingSession: { id: uid(), start: d.activeStart, end, hourlyRate: Number(d.hourlyRate), amount: calculatePay(d.activeStart, end, d.hourlyRate), status: 'pending' } }));
    setModal({ type: 'confirmSession' });
  }
  function confirmSession(session) {
    const normalized = { ...session, amount: calculatePay(session.start, session.end, session.hourlyRate), status: 'confirmed' };
    setData(d => ({ ...d, sessions: [normalized, ...d.sessions], pendingSession: null }));
    setModal(null); notify('درآمد نوبت کاری به کیف پول اضافه شد');
  }
  function saveTransaction(form) {
    const item = { id: form.id || uid(), type: form.type, title: form.title.trim(), note: form.note.trim(), amount: Math.max(0, Number(form.amount)), date: form.date || new Date().toISOString() };
    setData(d => ({ ...d, transactions: form.id ? d.transactions.map(t => t.id === form.id ? item : t) : [item, ...d.transactions] }));
    setModal(null); notify(form.id ? 'تراکنش ویرایش شد' : 'تراکنش ثبت شد');
  }
  function saveSession(form) {
    const item = { ...form, amount: calculatePay(form.start, form.end, form.hourlyRate), status: 'confirmed' };
    setData(d => ({ ...d, sessions: d.sessions.map(s => s.id === item.id ? item : s) }));
    setModal(null); notify('نوبت کاری و موجودی اصلاح شد');
  }
  function deleteItem(type, id) {
    if (!window.confirm('از حذف این مورد مطمئنی؟ موجودی کیف پول نیز اصلاح می‌شود.')) return;
    setData(d => type === 'session' ? { ...d, sessions: d.sessions.filter(s=>s.id!==id) } : { ...d, transactions: d.transactions.filter(t=>t.id!==id) });
    notify('مورد حذف شد و موجودی اصلاح شد');
  }

  if (!ready) return <div className="loading"><div className="loader"/>در حال آماده‌سازی اطلاعات…</div>;
  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark"><Activity size={21}/></div><div><strong>کارمَن</strong><small>مدیریت زمان و درآمد</small></div></div><button className="icon-button" onClick={() => setModal({type:'rate'})} aria-label="تنظیم دستمزد"><Settings2 size={20}/></button><ThemeSelector /></header>
    <main className="main-content">
      {page === 'home' ? <>
        <div className="welcome-row"><div><p className="eyebrow">داشبورد</p><h1>خلاصه وضعیت شما</h1></div><div className="today-chip"><CalendarDays size={15}/>{faDate(new Date())}</div></div>
        <section className="balance-card"><div className="balance-top"><span><Wallet size={17}/> موجودی کیف پول</span><span className="live-dot">●</span></div><div className="balance-amount">{toman(walletBalance)} <small>تومان</small></div><div className="balance-foot"><span>مجموع درآمد و هزینه‌های ثبت‌شده</span><span className={walletBalance < 0 ? 'negative' : ''}>{walletBalance < 0 ? 'موجودی منفی' : 'موجودی فعلی'}</span></div></section>
        <section className="work-card">
          <div className="section-heading"><div><p className="eyebrow">ثبت ساعات کاری</p><h2>وضعیت نوبت کاری</h2></div><span className={`status-pill ${data.activeStart ? 'working' : ''}`}>{data.activeStart ? 'در حال کار' : 'شروع نشده'}</span></div>
          <div className="timer-display"><Clock3 size={21}/><strong>{data.activeStart ? formatDuration(durationMinutes(data.activeStart, new Date(now))) : '۰ ساعت و ۰۰ دقیقه'}</strong></div>
          {data.activeStart && <div className="started-at">شروع: {faTime(data.activeStart)}</div>}
          {data.pendingSession && <button className="pending-note pending-action" onClick={() => setModal({type:'confirmSession'})}>یک نوبت کاری در انتظار تأیید داری؛ برای بررسی و تأیید لمس کن.</button>}
          <button className={`work-button ${data.activeStart ? 'stop' : ''}`} onClick={data.activeStart ? endWork : startWork} disabled={!data.activeStart && !!data.pendingSession}>{data.activeStart ? <><Square size={18} fill="currentColor"/> پایان کار</> : <><Play size={18} fill="currentColor"/> شروع کار</>}</button>
          <div className="rate-row"><span>دستمزد ساعتی</span><button onClick={() => setModal({type:'rate'})}>{toman(data.hourlyRate)} تومان <Edit3 size={14}/></button></div>
        </section>
        <section className="period-section"><div className="section-heading"><div><p className="eyebrow">عملکرد مالی</p><h2>گردش مالی</h2></div><select value={period} onChange={e=>setPeriod(e.target.value)} className="period-select"><option value="month">این ماه</option><option value="week">این هفته</option><option value="all">از ابتدا</option></select></div>
          <div className="finance-grid"><div className="finance-tile income"><div className="tile-icon"><ArrowDownLeft size={18}/></div><span>درآمد</span><strong>{toman(periodTotals.income)}</strong><small>تومان</small></div><div className="finance-tile expense"><div className="tile-icon"><ArrowUpRight size={18}/></div><span>هزینه</span><strong>{toman(periodTotals.expenses)}</strong><small>تومان</small></div></div>
          <div className="net-row"><span>خالص تغییر موجودی در این بازه</span><strong className={periodTotals.net < 0 ? 'negative' : ''}>{periodTotals.net > 0 ? '+' : ''}{toman(periodTotals.net)} تومان</strong></div>
        </section>
        <section className="quick-actions"><button className="action-card" onClick={()=>setModal({type:'transaction', transactionType:'expense'})}><span className="action-icon expense-icon"><ArrowUpRight size={20}/></span><span><strong>ثبت هزینه / برداشت</strong><small>ثبت مبلغ و توضیحات</small></span><ChevronLeft size={18}/></button><button className="action-card" onClick={()=>setModal({type:'transaction', transactionType:'income'})}><span className="action-icon income-icon"><Plus size={20}/></span><span><strong>ثبت درآمد متفرقه</strong><small>درآمد خارج از کار ساعتی</small></span><ChevronLeft size={18}/></button></section>
        <button className="reports-link" onClick={()=>setPage('reports')}><span className="reports-icon"><FileText size={19}/></span><span><strong>گزارشات و آرشیو</strong><small>مشاهده تمام سوابق مالی و کاری</small></span><ChevronLeft size={20}/></button>
      </> : <Reports data={data} onBack={()=>setPage('home')} onEditTransaction={t=>setModal({type:'transaction', transactionType:t.type, item:t})} onEditSession={s=>setModal({type:'editSession', item:s})} onDelete={deleteItem}/>}
    </main>
    <nav className="bottom-nav"><button className={page==='home'?'active':''} onClick={()=>setPage('home')}><Activity size={19}/><span>داشبورد</span></button><button className={page==='reports'?'active':''} onClick={()=>setPage('reports')}><FileText size={19}/><span>گزارشات</span></button></nav>
    {modal?.type==='rate' && <RateModal rate={data.hourlyRate} onClose={()=>setModal(null)} onSave={rate=>{setData(d=>({...d,hourlyRate:rate}));setModal(null);notify('دستمزد ساعتی به‌روزرسانی شد')}}/>}
    {modal?.type==='transaction' && <TransactionModal type={modal.transactionType} item={modal.item} onClose={()=>setModal(null)} onSave={saveTransaction}/>}
    {modal?.type==='confirmSession' && data.pendingSession && <SessionModal session={data.pendingSession} title="تأیید درآمد نوبت کاری" onClose={()=>setModal(null)} onSave={confirmSession} confirm/>}
    {modal?.type==='editSession' && <SessionModal session={modal.item} title="ویرایش نوبت کاری" onClose={()=>setModal(null)} onSave={saveSession}/>}
    {toast && <div className="toast"><Check size={16}/>{toast}</div>}
  </div>;
}

function Reports({data,onBack,onEditTransaction,onEditSession,onDelete}) {
  const [filter,setFilter]=useState('all');
  const entries=useMemo(()=>[
    ...data.sessions.filter(s=>s.status==='confirmed').map(s=>({...s,kind:'session',date:s.end})),
    ...data.transactions.map(t=>({...t,kind:'transaction'}))
  ].filter(item=>filter==='all'||(filter==='work'&&item.kind==='session')||(filter==='income'&&(item.type==='income'||item.kind==='session'))||(filter==='expense'&&item.type==='expense')).sort((a,b)=>new Date(b.date)-new Date(a.date)),[data,filter]);
  return <><div className="welcome-row reports-title"><div><button className="back-button" onClick={onBack}><ChevronLeft size={18}/> بازگشت</button><p className="eyebrow">آرشیو کامل</p><h1>گزارشات</h1></div><div className="report-count">{toman(entries.length)} مورد</div></div>
    <div className="filter-tabs">{[['all','همه'],['work','کار ساعتی'],['income','درآمدها'],['expense','هزینه‌ها']].map(([v,l])=><button key={v} className={filter===v?'selected':''} onClick={()=>setFilter(v)}>{l}</button>)}</div>
    <div className="archive-list">{entries.length===0?<div className="empty-state"><div className="empty-icon"><BriefcaseBusiness size={27}/></div><strong>هنوز سابقه‌ای ثبت نشده</strong><span>سوابق کاری و تراکنش‌های شما اینجا نمایش داده می‌شوند.</span></div>:entries.map(item=><article className="archive-item" key={`${item.kind}-${item.id}`}>
      <div className={`archive-icon ${item.kind==='session'?'work-archive':item.type==='income'?'income-icon':'expense-icon'}`}>{item.kind==='session'?<Clock3 size={19}/>:item.type==='income'?<ArrowDownLeft size={19}/>:<ArrowUpRight size={19}/>}</div>
      <div className="archive-main"><div className="archive-heading"><strong>{item.kind==='session'?'درآمد کار ساعتی':item.title}</strong><time>{faDate(item.date)}</time></div>
        {item.kind==='session'?<><p>{faTime(item.start)} تا {faTime(item.end)} · {formatDuration(durationMinutes(item.start,item.end))}</p><small>دستمزد: {toman(item.hourlyRate)} تومان / ساعت</small></>:<p>{item.note||'بدون توضیحات'}</p>}
        <div className="archive-bottom"><strong className={item.kind==='session'||item.type==='income'?'positive':'negative'}>{item.kind==='session'||item.type==='income'?'+':'−'}{toman(item.amount)} تومان</strong><div className="item-actions"><button onClick={()=>item.kind==='session'?onEditSession(item):onEditTransaction(item)} aria-label="ویرایش"><Edit3 size={15}/></button><button onClick={()=>onDelete(item.kind==='session'?'session':'transaction',item.id)} aria-label="حذف"><Trash2 size={15}/></button></div></div>
      </div></article>)}</div>
  </>;
}

function ModalFrame({title,onClose,children}) { return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal"><div className="modal-header"><h3>{title}</h3><button className="icon-button" onClick={onClose}><X size={19}/></button></div>{children}</div></div>; }
function RateModal({rate,onClose,onSave}) { const [value,setValue]=useState(String(rate)); return <ModalFrame title="تنظیم دستمزد ساعتی" onClose={onClose}><form onSubmit={e=>{e.preventDefault();if(Number(value)>=0)onSave(Number(value))}}><label>مبلغ دستمزد (تومان)<input type="number" min="0" step="1000" value={value} onChange={e=>setValue(e.target.value)} required/></label><p className="helper-text">این مبلغ فقط برای نوبت‌های کاری جدید اعمال می‌شود. دستمزد نوبت‌های قبلی ثابت می‌ماند.</p><button className="primary-button" type="submit">ذخیره دستمزد</button></form></ModalFrame>; }
function TransactionModal({type,item,onClose,onSave}) { const [title,setTitle]=useState(item?.title||''); const [note,setNote]=useState(item?.note||''); const [amount,setAmount]=useState(item?String(item.amount):''); const [date,setDate]=useState(item?new Date(item.date).toISOString().slice(0,10):new Date().toISOString().slice(0,10)); const income=type==='income'; return <ModalFrame title={item?'ویرایش تراکنش':income?'ثبت درآمد متفرقه':'ثبت هزینه / برداشت'} onClose={onClose}><form onSubmit={e=>{e.preventDefault();onSave({id:item?.id,type,title,note,amount,date:new Date(`${date}T12:00:00`).toISOString()})}}><label>{income?'عنوان درآمد':'عنوان هزینه'}<input value={title} onChange={e=>setTitle(e.target.value)} placeholder={income?'مثلاً پاداش':'مثلاً خرید وسایل'} required maxLength="60"/></label><label>مبلغ (تومان)<input type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)} required/></label><label>توضیحات (اختیاری)<textarea value={note} onChange={e=>setNote(e.target.value)} rows="3" placeholder="توضیحات بیشتر درباره این تراکنش"/></label><label>تاریخ<input type="date" value={date} onChange={e=>setDate(e.target.value)} required/></label><button className="primary-button" type="submit">{item?'ذخیره تغییرات':'ثبت تراکنش'}</button></form></ModalFrame>; }
function SessionModal({session,title,onClose,onSave,confirm=false}) { const local=(v)=>{const d=new Date(v);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`}; const [start,setStart]=useState(local(session.start)); const [end,setEnd]=useState(local(session.end)); const [rate,setRate]=useState(String(session.hourlyRate)); const startISO=new Date(start).toISOString(); const endISO=new Date(end).toISOString(); const valid=new Date(endISO)>new Date(startISO); const amount=valid?calculatePay(startISO,endISO,rate):0; return <ModalFrame title={title} onClose={onClose}><form onSubmit={e=>{e.preventDefault();if(valid)onSave({...session,start:startISO,end:endISO,hourlyRate:Number(rate),amount})}}><div className="two-fields"><label>ساعت شروع<input type="datetime-local" value={start} onChange={e=>setStart(e.target.value)} required/></label><label>ساعت پایان<input type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)} required/></label></div><label>دستمزد ساعتی (تومان)<input type="number" min="0" value={rate} onChange={e=>setRate(e.target.value)} required/></label><div className="calculation-box"><span>مدت کار: {valid?formatDuration(durationMinutes(startISO,endISO)):'زمان پایان باید بعد از شروع باشد'}</span><strong>{toman(amount)} تومان</strong></div><p className="helper-text">محاسبه بر اساس دقیقه انجام می‌شود. {confirm?'با تأیید، این مبلغ به کیف پول اضافه خواهد شد.':'با ذخیره، مبلغ این نوبت و موجودی کیف پول اصلاح می‌شود.'}</p><button className="primary-button" type="submit" disabled={!valid}>{confirm?'تأیید و افزودن به کیف پول':'ذخیره تغییرات'}</button></form></ModalFrame>; }

export default App;
