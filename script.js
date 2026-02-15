/* ===== Hover lighting for cards ===== */
document.querySelectorAll('.card').forEach(card=>{
  card.addEventListener('pointermove', e=>{
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', ((e.clientX - rect.left)/rect.width*100).toFixed(1)+'%');
    card.style.setProperty('--my', ((e.clientY - rect.top)/rect.height*100).toFixed(1)+'%');
  });
});

/* ===== Naruto leaves generator (light) ===== */
(function spawnLeaves(){
  const count = 28;
  for(let i=0;i<count;i++){
    const p = document.createElement('div');
    p.className = 'leaf';
    p.style.left = Math.random()*100 + 'vw';
    p.style.animationDuration = (9 + Math.random()*7) + 's';
    p.style.opacity = 0.35 + Math.random()*0.55;
    p.style.transform = 'rotate(' + (Math.random()*360) + 'deg)';
    document.body.appendChild(p);
  }
})();

/* ======= DSA Classes (LinkedList, Queue, Stack) ======= */
class SongNode {
  constructor({id,title,artist= 'Local',duration=0,mood='neutral',url=null}){
    this.id = id;
    this.title = title;
    this.artist = artist;
    this.duration = duration;
    this.mood = mood;
    this.url = url;
    this.next = null;
  }
}
class LinkedList {
  constructor(){ this.head=null; this.tail=null; this.size=0 }
  insert(node){
    if(!this.head){ this.head = this.tail = node }
    else { this.tail.next = node; this.tail = node }
    this.size++
  }
  toArray(){ const res=[]; let cur=this.head; while(cur){ res.push(cur); cur=cur.next } return res }
  getById(id){ let cur=this.head; while(cur){ if(cur.id===id) return cur; cur=cur.next } return null }
  clear(){ this.head=this.tail=null; this.size=0 }
  removeById(id){
    if(!this.head) return false
    if(this.head.id===id){ this.head=this.head.next; if(!this.head) this.tail=null; this.size--; return true }
    let prev=this.head, cur=this.head.next
    while(cur){ if(cur.id===id){ prev.next=cur.next; if(cur===this.tail) this.tail=prev; this.size--; return true } prev=cur; cur=cur.next }
    return false
  }
}
class QueueDS {
  constructor(){ this.items=[] }
  enqueue(x){ this.items.push(x) }
  dequeue(){ return this.items.shift() }
  clear(){ this.items = [] }
  isEmpty(){ return this.items.length===0 }
}
class StackDS {
  constructor(){ this.items=[] }
  push(x){ this.items.push(x) }
  pop(){ return this.items.pop() }
  isEmpty(){ return this.items.length===0 }
}

/* ===== State ===== */
const playlist = new LinkedList();
const upNext = new QueueDS();
const recent = new StackDS();
let current = null; 
let playing = false;
let analytics = {plays:0,skips:0};

/* ===== DOM ===== */
const $file = document.getElementById('fileInput');
const $playlist = document.getElementById('playlist');
const $queue = document.getElementById('queue');
const $recent = document.getElementById('recent');
const $nowInfo = document.getElementById('nowInfo');
const $audio = document.getElementById('audio');
const $playBtn = document.getElementById('playBtn');
const $prevBtn = document.getElementById('prevBtn');
const $nextBtn = document.getElementById('nextBtn');
const $playNextBtn = document.getElementById('playNextBtn');
const $plays = document.getElementById('plays');
const $skips = document.getElementById('skips');
const $plCount = document.getElementById('plCount');
const moodButtons = Array.from(document.querySelectorAll('.mood-btn'));
const $shuffleBtn = document.getElementById('shuffleBtn');
const $clearBtn = document.getElementById('clearBtn');
const $exportBtn = document.getElementById('exportBtn');
const $importBtn = document.getElementById('importBtn');

/* ===== Utils ===== */
const uid = ()=> 'id_'+Math.random().toString(36).slice(2,9);
const secToMM = s=> { s=Math.floor(s||0); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0') }
const randomMood = ()=> ['chill','focus','workout','party'][Math.floor(Math.random()*4)];

/* ===== Renderers ===== */
function renderPlaylist(){
  $playlist.innerHTML = '';
  const arr = playlist.toArray();
  $plCount.textContent = `(${arr.length})`;
  arr.forEach(node=>{
    const li = document.createElement('li');
    li.dataset.id = node.id;
    li.innerHTML = `<div style="flex:1"><strong>${node.title}</strong><div class="badge" style="color:var(--muted);font-size:12px">${node.artist} • ${node.mood} • ${secToMM(node.duration)}</div></div>`;
    if(current && current.id===node.id) li.classList.add('current');
    li.onclick = ()=> loadAndPlay(node.id);
    const actions = document.createElement('div');
    actions.style.display='flex'; actions.style.gap='6px';
    const del = document.createElement('button'); del.className='small-btn'; del.textContent='Del'; del.onclick = (e)=>{ e.stopPropagation(); playlist.removeById(node.id); upNext.items = upNext.items.filter(x=> x.id!==node.id); recent.items = recent.items.filter(x=> x.id!==node.id); if(current && current.id===node.id){ $audio.pause(); current=null; setPlayVisual(false); $nowInfo.textContent='No track selected' } renderAll() }
    const mv = document.createElement('button'); mv.className='small-btn'; mv.textContent='Q'; mv.title='Enqueue'; mv.onclick=(e)=>{ e.stopPropagation(); upNext.enqueue(node); renderQueue(); flash($queue) }
    actions.appendChild(mv); actions.appendChild(del);
    li.appendChild(actions);
    $playlist.appendChild(li);
  });
}
function renderQueue(){
  $queue.innerHTML='';
  upNext.items.forEach(node=>{
    const li = document.createElement('li');
    li.textContent = node.title + ' • ' + node.mood;
    $queue.appendChild(li);
  });
}
function renderRecent(){
  $recent.innerHTML='';
  [...recent.items].slice().reverse().forEach(node=>{
    const li=document.createElement('li');
    li.textContent = node.title+' • '+node.mood;
    li.onclick = ()=> loadAndPlay(node.id);
    $recent.appendChild(li);
  });
}
function renderAll(){
  renderPlaylist();
  renderQueue();
  renderRecent();
  $plays.textContent = analytics.plays;
  $skips.textContent = analytics.skips;
  if(current) $nowInfo.textContent = `▶ ${current.title} — ${current.artist} [${current.mood}]`;
  else $nowInfo.textContent = 'No track selected';
}
function flash(el){
  el.classList.add('flash');
  setTimeout(()=>el.classList.remove('flash'),900);
}

/* ===== Controls ===== */
function setPlayVisual(isPlaying){
  $playBtn.classList.toggle('is-playing', !!isPlaying);
  $playBtn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
}
function loadAndPlay(id){
  const node = playlist.getById(id);
  if(!node) return;
  if(current) recent.push(current);
  current = node;
  $audio.src = current.url;
  $audio.currentTime = 0;
  $audio.play().then(()=>{
    playing=true; setPlayVisual(true);
  }).catch(()=>{
    playing=false; setPlayVisual(false);
  });
  analytics.plays++;
  renderAll();
  flash(document.getElementById('middleCard') || document.body);
}
function playPauseToggle(){
  if(!current){
    const first = playlist.head;
    if(first) return loadAndPlay(first.id);
    return;
  }
  if($audio.paused){ $audio.play(); setPlayVisual(true); playing=true }
  else{ $audio.pause(); setPlayVisual(false); playing=false }
}
function nextSong(){
  if(!upNext.isEmpty()){
    const next = upNext.dequeue();
    loadAndPlay(next.id);
    renderQueue(); return;
  }
  if(!current) { if(playlist.head) return loadAndPlay(playlist.head.id); return }
  if(current.next){ return loadAndPlay(current.next.id) }
  $audio.pause(); playing=false; setPlayVisual(false);
}
function previousSong(){
  if(!recent.isEmpty()){
    const prev = recent.pop();
    if(prev) loadAndPlay(prev.id);
  }
}
function addCurrentToQueue(){
  if(!current) return alert('Play or select a track first');
  upNext.enqueue(current);
  renderQueue();
  flash($queue);
}

/* ===== Audio & buttons ===== */
$audio.addEventListener('ended', ()=>{ nextSong() });
$audio.addEventListener('play', ()=> setPlayVisual(true));
$audio.addEventListener('pause', ()=> setPlayVisual(false));

$playBtn.addEventListener('click', ()=> playPauseToggle());
$prevBtn.addEventListener('click', ()=> previousSong());
$nextBtn.addEventListener('click', ()=> nextSong());
$playNextBtn.addEventListener('click', ()=> addCurrentToQueue());

/* ===== File loader ===== */
$file.addEventListener('change', async (e)=>{
  const files = Array.from(e.target.files || []);
  for(const f of files){
    const url = URL.createObjectURL(f);
    const node = new SongNode({ id: uid(), title: f.name.replace(/\.[^/.]+$/,''), artist:'Local', duration:0, mood: randomMood(), url });
    playlist.insert(node);
    try{
      const tmp = document.createElement('audio'); tmp.src = url;
      await new Promise(res=> tmp.addEventListener('loadedmetadata', ()=> res(), {once:true}));
      node.duration = Math.floor(tmp.duration || 0);
      tmp.remove();
    }catch(err){}
  }
  renderAll();
});

/* ===== Tools ===== */
$shuffleBtn && $shuffleBtn.addEventListener('click', ()=>{
  const arr = playlist.toArray();
  for(let i=arr.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]] }
  playlist.clear();
  arr.forEach(n=>{ n.next = null; playlist.insert(n) });
  renderAll();
});
$clearBtn && $clearBtn.addEventListener('click', ()=>{
  if(!confirm('Clear playlist, queue and recent?')) return;
  playlist.clear(); upNext.clear(); recent.items=[]; current=null; $audio.pause(); $audio.src='';
  analytics.plays=0; analytics.skips=0;
  setPlayVisual(false);
  renderAll();
});
$exportBtn && $exportBtn.addEventListener('click', ()=>{
  const data = { playlist: playlist.toArray(), analytics };
  const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'playlist.json'; a.click();
});
$importBtn && $importBtn.addEventListener('click', ()=>{
  const inp = document.createElement('input'); inp.type='file'; inp.accept='application/json';
  inp.onchange = async (e)=>{
    const f = e.target.files[0]; if(!f) return;
    const text = await f.text(); const data = JSON.parse(text);
    playlist.clear(); upNext.clear(); recent.items=[];
    for(const item of data.playlist){ const node = new SongNode({...item, url:null}); playlist.insert(node) }
    analytics = data.analytics || analytics;
    renderAll();
  };
  inp.click();
});

/* ===== Improved Mood Filter + Auto Queue ===== */

let currentMoodFilter = null;

moodButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const mood = btn.dataset.mood;
    const allSongs = playlist.toArray();
    const moodSongs = allSongs.filter(song => song.mood === mood);

    if (!moodSongs.length) {
      alert(`⚠️ No songs found for mood: ${mood}`);
      return;
    }

    // Set mood filter
    currentMoodFilter = mood;
    document.body.setAttribute("data-mood", mood);

    // Clear existing queue
    upNext.clear();

    // Play the first song of this mood
    const firstSong = moodSongs[0];
    loadAndPlay(firstSong.id);

    // Add remaining mood songs to the queue
    for (let i = 1; i < moodSongs.length; i++) {
      upNext.enqueue(moodSongs[i]);
    }

    renderQueue();
    flash($queue);

    // Update playlist view to show only mood songs
    renderFilteredPlaylist(moodSongs);
  });
});

function renderFilteredPlaylist(filteredArr) {
  $playlist.innerHTML = '';
  $plCount.textContent = `(${filteredArr.length})`;

  filteredArr.forEach(node => {
    const li = document.createElement('li');
    li.dataset.id = node.id;
    li.innerHTML = `
      <div style="flex:1">
        <strong>${node.title}</strong>
        <div class="badge" style="color:var(--muted);font-size:12px">
          ${node.artist} • ${node.mood} • ${secToMM(node.duration)}
        </div>
      </div>`;
    if (current && current.id === node.id) li.classList.add('current');
    li.onclick = () => loadAndPlay(node.id);
    $playlist.appendChild(li);
  });

  $nowInfo.textContent = `Mood: ${currentMoodFilter.toUpperCase()} Mode`;
}


renderAll();

/* ===== Chakra Visualizer (Bass + Treble Reactive) ===== */
const chakraCanvas = document.getElementById("chakraCanvas");
const cctx = chakraCanvas.getContext("2d");
let chakraCtx, chakraAnalyser, chakraSource, chakraData, chakraBuffer;

function setupChakraVisualizer() {
  if (!chakraCtx) {
    chakraCtx = new AudioContext();
    chakraAnalyser = chakraCtx.createAnalyser();
    chakraSource = chakraCtx.createMediaElementSource($audio);
    chakraSource.connect(chakraAnalyser);
    chakraAnalyser.connect(chakraCtx.destination);
    chakraAnalyser.fftSize = 512;
    chakraBuffer = chakraAnalyser.frequencyBinCount;
    chakraData = new Uint8Array(chakraBuffer);
    drawChakra();
  }
}

function drawChakra() {
  requestAnimationFrame(drawChakra);
  if (!chakraAnalyser) return;

  chakraAnalyser.getByteFrequencyData(chakraData);
  const width = chakraCanvas.width = chakraCanvas.offsetWidth;
  const height = chakraCanvas.height = chakraCanvas.offsetHeight;
  const cx = width / 2;
  const cy = height / 2;
  const baseRadius = Math.min(width, height) / 3.2;

  cctx.clearRect(0, 0, width, height);

  // Split frequency data roughly: bass = lower 1/3, treble = upper 1/3
  const bassData = chakraData.slice(0, chakraBuffer / 3);
  const trebleData = chakraData.slice((chakraBuffer / 3) * 2);

  const avgBass = bassData.reduce((a, b) => a + b, 0) / bassData.length / 255;
  const avgTreble = trebleData.reduce((a, b) => a + b, 0) / trebleData.length / 255;

  const bassPulse = 1 + avgBass * 0.3;
  const treblePulse = 1 + avgTreble * 0.6;

  // Chakra aura background
  const aura = cctx.createRadialGradient(cx, cy, baseRadius * 0.4, cx, cy, baseRadius * 1.6);
  aura.addColorStop(0, `rgba(255,123,0,${0.1 + avgBass * 0.5})`);
  aura.addColorStop(1, `rgba(0,208,132,${0.15 + avgTreble * 0.6})`);
  cctx.fillStyle = aura;
  cctx.beginPath();
  cctx.arc(cx, cy, baseRadius * 1.8, 0, Math.PI * 2);
  cctx.fill();

  const bars = 90;
  const step = (Math.PI * 2) / bars;

  for (let i = 0; i < bars; i++) {
    const freqIndex = Math.floor((i / bars) * chakraData.length);
    const value = chakraData[freqIndex] / 255;
    const isBass = i < bars / 3;

    const radius = baseRadius * (isBass ? bassPulse : treblePulse);
    const barLength = value * (isBass ? 60 : 90);
    const angle = i * step;

    const x1 = cx + Math.cos(angle) * radius;
    const y1 = cy + Math.sin(angle) * radius;
    const x2 = cx + Math.cos(angle) * (radius + barLength);
    const y2 = cy + Math.sin(angle) * (radius + barLength);

    const grad = cctx.createLinearGradient(x1, y1, x2, y2);
    if (isBass) {
      grad.addColorStop(0, "rgba(255,123,0,1)");
      grad.addColorStop(1, "rgba(255,196,0,0.8)");
    } else {
      grad.addColorStop(0, "rgba(0,208,132,1)");
      grad.addColorStop(1, "rgba(0,255,200,0.8)");
    }

    cctx.strokeStyle = grad;
    cctx.lineWidth = isBass ? 3.6 : 2;
    cctx.beginPath();
    cctx.moveTo(x1, y1);
    cctx.lineTo(x2, y2);
    cctx.stroke();
  }

  // Outer glowing chakra ring
  cctx.beginPath();
  cctx.arc(cx, cy, baseRadius * (1.05 + avgTreble * 0.1), 0, Math.PI * 2);
  const outerGrad = cctx.createRadialGradient(cx, cy, baseRadius * 0.9, cx, cy, baseRadius * 1.5);
  outerGrad.addColorStop(0, "rgba(255,123,0,0.3)");
  outerGrad.addColorStop(1, "rgba(0,208,132,0.3)");
  cctx.strokeStyle = outerGrad;
  cctx.lineWidth = 6;
  cctx.stroke();
}

// When the current song finishes
// Handle when the current song finishes
$audio.addEventListener("ended", () => {
  if (!upNext.isEmpty()) {
    // If there are songs left in the queue, play the next one
    nextSong();
  } 
  else if (typeof currentMoodFilter === "string" && currentMoodFilter !== null) {
    // All songs for the current mood finished
    alert(`🎵 All songs in "${currentMoodFilter.toUpperCase()}" mood finished.`);
    currentMoodFilter = null;
    document.body.removeAttribute("data-mood"); // reset color theme
    renderAll(); // reset playlist view
  } 
  else {
    // No mood filter and queue empty: stop playback
    playing = false;
    setPlayVisual(false);
  }
});


$audio.addEventListener("play", () => {
  setupChakraVisualizer();
  if (chakraCtx.state === "suspended") chakraCtx.resume();
});

/* ===== Chakra Slider Control ===== */
const seekBar = document.getElementById("seekBar");
const currentTimeEl = document.getElementById("currentTime");
const totalTimeEl = document.getElementById("totalTime");

$audio.addEventListener("loadedmetadata", () => {
  seekBar.max = Math.floor($audio.duration);
  totalTimeEl.textContent = secToMM($audio.duration);
});

$audio.addEventListener("timeupdate", () => {
  if (!$audio.duration) return;
  seekBar.value = Math.floor($audio.currentTime);
  currentTimeEl.textContent = secToMM($audio.currentTime);

  const progress = ($audio.currentTime / $audio.duration) * 100;
  seekBar.style.background = `linear-gradient(90deg,
    rgba(255,123,0,0.9) ${progress}%,
    rgba(0,208,132,0.3) ${progress}%)`;
});

seekBar.addEventListener("input", () => {
  $audio.currentTime = seekBar.value;
});

const logoutBtn = document.getElementById('logoutBtn');
if(logoutBtn){
  logoutBtn.addEventListener('click', ()=>{
    sessionStorage.removeItem('loggedInUser');
    window.location.href = 'login.html';
  });
}
