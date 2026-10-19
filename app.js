import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg = window.FAMILY_CONFIG || {};
const $ = id => document.getElementById(id);
const zone = 'Europe/Copenhagen';
const configured = /^https:\/\/.+\.supabase\.co$/.test(cfg.supabaseUrl || '') && cfg.supabaseKey && !cfg.supabaseKey.startsWith('INDSAET_');
const supabase = configured ? createClient(cfg.supabaseUrl, cfg.supabaseKey) : null;
const active = new Set(['Danni','Cathrine','Familie']);
let events = [];
const dayFmt = new Intl.DateTimeFormat('da-DK',{timeZone:zone,weekday:'long',day:'numeric',month:'long'});
const timeFmt = new Intl.DateTimeFormat('da-DK',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const dateFmt = new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'});
const dateKey = d => {const parts=Object.fromEntries(dateFmt.formatToParts(d).map(x=>[x.type,x.value]));return `${parts.year}-${parts.month}-${parts.day}`;};
const plusDays = (key,n) => {const [y,m,d]=key.split('-').map(Number);return new Date(Date.UTC(y,m-1,d+n)).toISOString().slice(0,10)};
const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function category(e){
  if(cfg.familyCalendarId && e.calendar_id === cfg.familyCalendarId) return 'Familie';
  const id=String(e.calendar_id||'').toLowerCase();
  if(/familie|family/.test(id)) return 'Familie';
  return e.person === 'Danni' ? 'Danni' : 'Cathrine';
}
function localDayParts(key){const [y,m,d]=key.split('-').map(Number);return new Date(Date.UTC(y,m-1,d,12));}
function dayRange(key){
  // UTC boundaries are generous; exact membership is checked by local date below.
  const day=new Date(`${key}T00:00:00Z`).getTime();
  return [day-15*3600000,day+39*3600000];
}
function coversDay(e,key){
  const [low,high]=dayRange(key);
  const start=Date.parse(e.starts_at),end=Date.parse(e.ends_at||e.starts_at);
  if(!Number.isFinite(start))return false;
  if(e.all_day){
    // Calendar all-day end is exclusive; display each occupied day.
    const startKey=dateKey(new Date(start));
    const endKey=dateKey(new Date(Math.max(start,end-1)));
    return key>=startKey&&key<=endKey;
  }
  if(end<=low||start>=high)return false;
  // A timed event belongs to the day if any part intersects that Copenhagen day.
  const startKey=dateKey(new Date(start));
  const endKey=dateKey(new Date(Math.max(start,end-1)));
  return key>=startKey&&key<=endKey;
}
function visible(e,now){const end=Date.parse(e.ends_at||e.starts_at);return !e.deleted_at && (e.all_day || !Number.isFinite(end) || end>now);}
function eventTime(e,key){
  if(e.all_day)return 'Hele dagen';
  const s=new Date(e.starts_at),end=new Date(e.ends_at||e.starts_at);
  const starts=dateKey(s)===key,ends=dateKey(new Date(end.getTime()-1))===key;
  if(starts&&ends)return `${timeFmt.format(s)}–${timeFmt.format(end)}`;
  if(starts)return `Fra ${timeFmt.format(s)}`;
  if(ends)return `Til ${timeFmt.format(end)}`;
  return 'Hele dagen';
}
function normalized(s){return String(s||'').toLocaleLowerCase('da-DK').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();}
function mergedForDay(list){
  // Very conservative: only exact normalized title + matching start/end + same all-day state.
  const groups=[];
  for(const e of list){
    const match=groups.find(g=>g.some(x=>x.person!==e.person && normalized(x.title)===normalized(e.title) && normalized(e.title).length>2 && x.starts_at===e.starts_at && x.ends_at===e.ends_at && !!x.all_day===!!e.all_day));
    if(match)match.push(e);else groups.push([e]);
  }
  return groups;
}
function render(){
  const now=Date.now(),today=dateKey(new Date());
  $('dateLine').textContent=dayFmt.format(new Date());
  $('todayDate').textContent=Number(today.slice(-2));
  $('todayName').textContent=dayFmt.format(new Date());
  $('clock').textContent=timeFmt.format(new Date());
  const days=[];
  for(let i=0;i<7;i++){
    const key=plusDays(today,i);
    const items=events.filter(e=>visible(e,now)&&active.has(category(e))&&coversDay(e,key))
      .sort((a,b)=>Number(!!b.all_day)-Number(!!a.all_day) || Date.parse(a.starts_at)-Date.parse(b.starts_at));
    const groups=mergedForDay(items);
    const content=groups.map(g=>{
      const e=g[0],cats=[...new Set(g.map(category))],kind=cats.length>1?'mixed':cats[0].toLowerCase();
      const label=cats.join(' + ');
      return `<article class="event ${kind}"><span class="event-time">${escapeHtml(eventTime(e,key))}</span><div><div class="event-title">${escapeHtml(e.title||'Uden titel')}</div><div class="event-meta">${escapeHtml(label)}${e.location?' · '+escapeHtml(e.location):''}</div></div></article>`;
    }).join('')||'<div class="empty">Ingen aftaler</div>';
    const label=i===0?'I dag':dayFmt.format(localDayParts(key)).split(' ')[0];
    const d=dayFmt.format(localDayParts(key)).replace(/^\S+\s*/, '');
    days.push(`<section class="day ${i===0?'today':''}"><div class="day-label">${escapeHtml(label)}<small>${escapeHtml(d)}</small></div><div class="event-list">${content}</div></section>`);
  }
  $('days').innerHTML=days.join('');
  const upcoming=events.filter(e=>visible(e,now)&&active.has(category(e))&&dateKey(new Date(e.starts_at))<=plusDays(today,6))
    .sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at));
  const next=upcoming.find(e=>e.all_day || Date.parse(e.starts_at)>=now) || upcoming[0];
  $('nextEvent').innerHTML=next?`${escapeHtml(next.title||'Uden titel')}<small>${escapeHtml(dayFmt.format(new Date(next.starts_at)))} · ${escapeHtml(next.all_day?'Hele dagen':timeFmt.format(new Date(next.starts_at)))} · ${escapeHtml(category(next))}</small>`:'Ingen kommende aftaler';
}
async function load(){
  const start=plusDays(dateKey(new Date()),-1),end=plusDays(dateKey(new Date()),8);
  // Include multi-day events that started earlier; deleted rows never appear.
  const {data,error}=await supabase.from('family_calendar_events').select('person,calendar_id,title,location,starts_at,ends_at,all_day,deleted_at,external_id').is('deleted_at',null).lt('starts_at',`${end}T23:59:59Z`).gt('ends_at',`${start}T00:00:00Z`).order('starts_at',{ascending:true}).limit(1500);
  if(error){$('status').textContent='Kunne ikke hente kalenderen: '+error.message;return;}
  events=data||[];$('status').textContent='';$('updated').textContent='Senest hentet '+timeFmt.format(new Date());render();
}
async function init(){
  if(!configured){$('login').classList.remove('hidden');$('loginError').textContent='Åbn config.js, og indsæt Supabase publishable key først.';return;}
  const {data:{session}}=await supabase.auth.getSession();
  showSession(!!session);
  supabase.auth.onAuthStateChange((_event,session)=>{showSession(!!session);});
}
function showSession(loggedIn){$('login').classList.toggle('hidden',loggedIn);$('app').classList.toggle('hidden',!loggedIn);if(loggedIn)load();}
$('loginForm').addEventListener('submit',async ev=>{ev.preventDefault();$('loginError').textContent='';const {error}=await supabase.auth.signInWithPassword({email:$('email').value,password:$('password').value});if(error)$('loginError').textContent='Login mislykkedes: '+error.message;});
$('logout').addEventListener('click',()=>supabase.auth.signOut());
$('filters').addEventListener('click',ev=>{const b=ev.target.closest('[data-filter]');if(!b)return;const name=b.dataset.filter;if(active.has(name))active.delete(name);else active.add(name);b.classList.toggle('active',active.has(name));render();});
setInterval(()=>{if(!$('app').classList.contains('hidden'))render();},30000);
setInterval(()=>{if(!$('app').classList.contains('hidden'))load();},300000);
init();
