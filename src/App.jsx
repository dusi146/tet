import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, X, Save, Volume2, VolumeX } from 'lucide-react';

/* FONTS LOADING
  - Playfair Display SC: Tiêu đề trang trọng.
  - Dancing Script: Thư pháp mềm mại.
  - Playfair Display: Nội dung.
*/

const App = () => {
  // --- STATE MANAGEMENT ---
  const [scene, setScene] = useState('intro'); 
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCodePopup, setShowCodePopup] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Content State - Lazy Init from LocalStorage (Fix reset issue)
  const [userName, setUserName] = useState(() => localStorage.getItem('tet2026_userName') || "Phạm Duy Thái");
  const [wishContent, setWishContent] = useState(() => localStorage.getItem('tet2026_wishContent') || "Cung Chúc Tân Xuân\nVạn Sự Như Ý\nTấn Tài Tấn Lộc\nAn Khang Thịnh Vượng");
  const [wishFont, setWishFont] = useState(() => localStorage.getItem('tet2026_wishFont') || 'font-calligraphy'); 
  const [wishColor, setWishColor] = useState(() => localStorage.getItem('tet2026_wishColor') || 'text-yellow-200');

  // Interaction State
  const [longPressProgress, setLongPressProgress] = useState(0);
  const [isUnlockedForTap, setIsUnlockedForTap] = useState(false);
  const [secretCode, setSecretCode] = useState('');
  const [inputError, setInputError] = useState(false);
  const [flashIntensity, setFlashIntensity] = useState(0); 

  // Refs
  const pressTimer = useRef(null);
  const progressInterval = useRef(null);
  const fireworkRainInterval = useRef(null); 
  const lastTap = useRef(0);
  const canvasRef = useRef(null);
  const fireworksRef = useRef([]);
  const audioCtxRef = useRef(null); // Web Audio Context

  // --- STYLES ---
  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display+SC:wght@700&family=Dancing+Script:wght@700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');

    .font-title { font-family: 'Playfair Display SC', serif; }
    .font-calligraphy { font-family: 'Dancing Script', cursive; }
    .font-serif-modern { font-family: 'Playfair Display', serif; }

    @keyframes float {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
      100% { transform: translateY(0px); }
    }
    
    @keyframes bloom {
      0% { opacity: 0; transform: scale(0.8); }
      100% { opacity: 1; transform: scale(1); }
    }
    
    @keyframes slide-up-fade {
      0% { transform: translateY(20px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }

    .animate-float { animation: float 6s ease-in-out infinite; }
    .animate-bloom { animation: bloom 2s ease-out forwards; }
    .animate-slide-up { animation: slide-up-fade 1.5s ease-out forwards; }
    .animate-shake { animation: shake 0.3s ease-in-out; }
    
    .text-glow { text-shadow: 0 0 10px rgba(255, 215, 0, 0.5), 0 0 20px rgba(255, 215, 0, 0.3); }
    .bg-tet-gradient { background: radial-gradient(circle at center, #800000 0%, #3a0000 100%); }
  `;

  // --- SAVE HANDLER ---
  const handleSaveSettings = () => {
    localStorage.setItem('tet2026_userName', userName);
    localStorage.setItem('tet2026_wishContent', wishContent);
    localStorage.setItem('tet2026_wishFont', wishFont);
    localStorage.setItem('tet2026_wishColor', wishColor);
    setShowEditModal(false);
  };

  // --- SOUND SYNTHESIZER (Web Audio API) ---
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playSoundEffect = useCallback((type) => {
    if (!soundEnabled || !audioCtxRef.current) return;
    
    const ctx = audioCtxRef.current;
    const t = ctx.currentTime;

    if (type === 'launch') {
      // Smooth "Whoosh"
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.5); 
      
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      
      osc.start(t);
      osc.stop(t + 0.5);
    } 
    
    else if (type === 'explode') {
      // Cinematic Boom (Single shot)
      const bufferSize = ctx.sampleRate * 2; 
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(800, t); 
      noiseFilter.frequency.exponentialRampToValueAtTime(100, t + 1);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.8, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2); 

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(t);

      // Sub-bass
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(60, t); 
      subOsc.frequency.exponentialRampToValueAtTime(30, t + 0.5); 
      subGain.gain.setValueAtTime(0.6, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      subOsc.start(t);
      subOsc.stop(t + 0.5);
    } 
    
    else if (type === 'rapid') {
       // --- "Piuuu... Bùm" Realistic Sequence ---
       const randomRate = 0.9 + Math.random() * 0.4; // Random pitch/speed variation

       // 1. THE WHISTLE (Piuuu)
       const osc = ctx.createOscillator();
       const oscGain = ctx.createGain();
       osc.connect(oscGain);
       oscGain.connect(ctx.destination);
       
       osc.type = 'sine';
       // Quick sweep up
       const startFreq = 300 * randomRate;
       const endFreq = 900 * randomRate;
       
       osc.frequency.setValueAtTime(startFreq, t);
       osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.15); // Short whistle
       
       oscGain.gain.setValueAtTime(0.08, t);
       oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
       
       osc.start(t);
       osc.stop(t + 0.15);

       // 2. THE EXPLOSION (Bùm) - Delayed slightly
       const boomTime = t + 0.1; // Overlap whistle end
       
       const bufferSize = ctx.sampleRate * 1.5; 
       const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
       const data = buffer.getChannelData(0);
       for (let i = 0; i < bufferSize; i++) {
         data[i] = Math.random() * 2 - 1;
       }
       const noise = ctx.createBufferSource();
       noise.buffer = buffer;
       
       const filter = ctx.createBiquadFilter();
       filter.type = 'lowpass';
       filter.frequency.setValueAtTime(1000, boomTime);
       filter.frequency.exponentialRampToValueAtTime(50, boomTime + 0.4);

       const gain = ctx.createGain();
       // Higher volume for chaos
       gain.gain.setValueAtTime(0.6, boomTime); 
       gain.gain.exponentialRampToValueAtTime(0.001, boomTime + 0.4);

       noise.connect(filter);
       filter.connect(gain);
       gain.connect(ctx.destination);
       
       noise.start(boomTime);
    }
  }, [soundEnabled]);


  // --- FIREWORK SYSTEM HELPERS ---
  const createFirework = (x, y, isRain = false) => {
    const colors = ['#FFD700', '#FF4500', '#FFFFFF', '#FFA500', '#F0E68C'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const particleCount = isRain ? 20 : 50; 
    
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 2;
      particles.push({
        x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        alpha: 1, decay: Math.random() * 0.015 + 0.01, color: color, gravity: 0.05
      });
    }
    fireworksRef.current.push({ particles });
  };

  const launchFirework = (isRapid = false) => {
    const targetX = Math.random() * window.innerWidth;
    const targetY = window.innerHeight * 0.2 + Math.random() * (window.innerHeight * 0.4);
    
    createFirework(targetX, targetY, isRapid);
    
    // Audio Triggers
    if (isRapid) {
      playSoundEffect('rapid');
    } else {
      playSoundEffect('launch');
      setTimeout(() => playSoundEffect('explode'), 200); 
    }
  };

  // --- CANVAS LOOP ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    let bgParticles = [];
    const bgCount = 50;

    class BgParticle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 3 + 1;
        this.speedY = Math.random() * 0.5 + 0.2;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.opacity = Math.random() * 0.5 + 0.3;
        this.type = Math.random() > 0.8 ? 'flower' : 'dust';
      }
      update() {
        this.y += this.speedY; this.x += this.speedX;
        if (this.y > height) this.y = 0; if (this.x > width) this.x = 0; if (this.x < 0) this.x = width;
      }
      draw() {
        ctx.beginPath();
        if (this.type === 'flower') {
          ctx.fillStyle = `rgba(255, 223, 0, ${this.opacity})`;
          ctx.arc(this.x, this.y, this.size * 1.5, 0, Math.PI * 2);
        } else {
          ctx.fillStyle = `rgba(255, 215, 0, ${this.opacity})`;
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    }
    for (let i = 0; i < bgCount; i++) bgParticles.push(new BgParticle());

    const animate = () => {
      ctx.fillStyle = 'rgba(58, 0, 0, 0.2)';
      ctx.fillRect(0, 0, width, height);
      bgParticles.forEach(p => { p.update(); p.draw(); });
      for (let i = fireworksRef.current.length - 1; i >= 0; i--) {
        const fw = fireworksRef.current[i];
        let aliveParticles = false;
        fw.particles.forEach(p => {
          if (p.alpha > 0) {
            aliveParticles = true;
            p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.vx *= 0.96; p.vy *= 0.96; p.alpha -= p.decay;
            ctx.beginPath(); ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
          }
        });
        if (!aliveParticles) fireworksRef.current.splice(i, 1);
      }
      requestAnimationFrame(animate);
    };
    animate();
    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- SCENE TRANSITION ---
  useEffect(() => {
    if (scene === 'intro') {
      const timer = setTimeout(() => setScene('greeting'), 3500); 
      return () => clearTimeout(timer);
    }
    if (scene === 'greeting') {
      const timer = setTimeout(() => setScene('wish'), 4000); 
      return () => clearTimeout(timer);
    }
  }, [scene]);

  // --- INTERACTION LOGIC ---
  const startPress = useCallback((e) => {
    if (e.type === 'mousedown' && e.button !== 0) return;
    initAudio(); 
    setLongPressProgress(0);
    setFlashIntensity(0);
    
    progressInterval.current = setInterval(() => {
      setLongPressProgress(prev => {
        if (prev >= 100) { clearInterval(progressInterval.current); return 100; }
        return prev + 1.5;
      });
      setFlashIntensity(prev => Math.min(0.8, prev + 0.01));
    }, 45);
    
    fireworkRainInterval.current = setInterval(() => { 
        launchFirework(true); 
    }, 120);
    
    pressTimer.current = setTimeout(() => { setIsUnlockedForTap(true); if (navigator.vibrate) navigator.vibrate(200); }, 3000);
  }, [soundEnabled]);

  const endPress = useCallback(() => {
    clearInterval(progressInterval.current);
    clearTimeout(pressTimer.current);
    clearInterval(fireworkRainInterval.current);
    setLongPressProgress(0);
    setFlashIntensity(0);
  }, []);

  const handleTap = useCallback((e) => {
    initAudio(); 
    launchFirework(false); 
    
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap.current;
    if (isUnlockedForTap && tapLength < 500 && tapLength > 0) {
      setTimeout(() => setShowCodePopup(true), 300);
      setIsUnlockedForTap(false);
    }
    lastTap.current = currentTime;
  }, [isUnlockedForTap, soundEnabled]);

  const verifyCode = () => {
    if (secretCode === '3479') {
      setShowCodePopup(false);
      setShowEditModal(true);
      setSecretCode('');
      setInputError(false);
    } else {
      setInputError(true);
      setTimeout(() => setInputError(false), 500);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-tet-gradient text-white select-none touch-manipulation">
      <style>{styles}</style>
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none z-0" />
      <div className="absolute inset-0 bg-yellow-100 pointer-events-none z-40 transition-opacity duration-100 mix-blend-overlay" style={{ opacity: flashIntensity }}></div>

      {/* Audio Toggle */}
      <button 
        onClick={() => { setSoundEnabled(!soundEnabled); initAudio(); }}
        className="absolute top-4 right-4 z-50 p-2 bg-black/20 rounded-full backdrop-blur-sm hover:bg-black/40 transition"
      >
        {soundEnabled ? <Volume2 size={20} className="text-yellow-200" /> : <VolumeX size={20} className="text-red-300" />}
      </button>

      {/* --- SCENE 1: INTRO --- */}
      {scene === 'intro' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 animate-bloom">
          <div className="text-yellow-400 font-title text-xl tracking-[0.3em] opacity-80 mb-4 animate-float">CHÀO XUÂN</div>
          <h1 className="text-6xl md:text-8xl font-title font-bold text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-600 drop-shadow-lg tracking-wider">2026</h1>
          <div className="mt-4 text-red-200 font-serif-modern italic text-lg tracking-widest">Bính Ngọ</div>
        </div>
      )}

      {/* --- SCENE 2: GREETING --- */}
      {scene === 'greeting' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center animate-slide-up">
           <div className="text-yellow-100 font-serif-modern italic text-2xl md:text-3xl mb-4 opacity-80">
             Xin chào,
           </div>
           <div className="text-4xl md:text-6xl font-title font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 text-glow tracking-wide text-center px-4 leading-tight">
             {userName}
           </div>
           <div className="mt-8 w-24 h-0.5 bg-gradient-to-r from-transparent via-yellow-500 to-transparent"></div>
        </div>
      )}

      {/* --- SCENE 3: MAIN WISH --- */}
      {scene === 'wish' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-between py-12 px-6 fade-in duration-1000">
          <div className="w-full flex justify-center opacity-70"><div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-yellow-300 to-transparent"></div></div>
          
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg text-center relative pointer-events-none">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-yellow-500/50 rounded-tl-lg"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-yellow-500/50 rounded-tr-lg"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-yellow-500/50 rounded-bl-lg"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-yellow-500/50 rounded-br-lg"></div>

            <div className={`${wishFont} ${wishColor} text-4xl md:text-5xl leading-relaxed md:leading-loose text-glow transition-all duration-500 p-8`}>
              {wishContent.split('\n').map((line, i) => (
                <div key={i} className="animate-float" style={{animationDelay: `${i * 0.5}s`}}>{line}</div>
              ))}
            </div>
            <div className="mt-8"><div className="text-yellow-500/60 text-xs tracking-[0.5em] font-title">BÍNH NGỌ 2026</div></div>
          </div>

          <div className="relative mb-8 flex flex-col items-center justify-center w-full z-50">
            {isUnlockedForTap && (
              <div className="absolute -top-14 text-yellow-200 text-xs animate-pulse font-sans tracking-widest uppercase bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm border border-yellow-500/30">HÉP BI NIU DIA</div>
            )}
            <div className="relative group">
              <svg className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 pointer-events-none">
                 <circle cx="48" cy="48" r="46" stroke="rgba(255,255,255,0.1)" strokeWidth="1" fill="none" />
                 <circle cx="48" cy="48" r="46" stroke="#FFD700" strokeWidth="3" fill="none" strokeDasharray="289" strokeDashoffset={289 - (289 * longPressProgress) / 100} className="transition-all duration-75 ease-linear rotate-[-90deg] origin-center drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]"/>
              </svg>
              <button
                onMouseDown={startPress} onMouseUp={endPress} onMouseLeave={endPress} onTouchStart={startPress} onTouchEnd={endPress} onClick={handleTap}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 ${isUnlockedForTap ? 'bg-yellow-400 shadow-[0_0_50px_rgba(255,215,0,0.8)] scale-110' : 'bg-gradient-to-br from-red-900 to-red-950 border border-yellow-500/40 shadow-[0_0_20px_rgba(255,0,0,0.4)]'}`}
              >
                <Sparkles className={`${isUnlockedForTap ? 'text-red-600 w-10 h-10 animate-spin' : 'text-yellow-200 w-8 h-8 animate-pulse'} transition-all duration-300`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SECRET CODE POPUP --- */}
      {showCodePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-bloom">
          <div className={`bg-red-950 border border-yellow-600/50 p-8 rounded-2xl w-full max-w-sm text-center shadow-2xl ${inputError ? 'animate-shake border-red-500' : ''}`}>
             <h3 className="text-yellow-400 font-title text-xl mb-6">CỬA SỔ CHỈNH LỜI CHÚC</h3>
             <div className="flex justify-center gap-2 mb-6">{[0, 1, 2, 3].map((idx) => (<div key={idx} className={`w-3 h-3 rounded-full ${secretCode.length > idx ? 'bg-yellow-400 shadow-[0_0_10px_gold]' : 'bg-red-900'}`}></div>))}</div>
             <div className="grid grid-cols-3 gap-4 mb-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (<button key={num} onClick={() => setSecretCode(prev => (prev.length < 4 ? prev + num : prev))} className="h-12 w-12 mx-auto rounded-full bg-red-900/50 text-yellow-200 font-serif border border-transparent active:border-yellow-500 active:bg-red-800 transition-all">{num}</button>))}
                <button className="col-start-2 h-12 w-12 mx-auto rounded-full bg-red-900/50 text-yellow-200" onClick={() => setSecretCode(prev => prev + '0')}>0</button>
                <button className="h-12 flex items-center justify-center text-red-400" onClick={() => setSecretCode(prev => prev.slice(0, -1))}><X size={20}/></button>
             </div>
             <div className="flex justify-between items-center mt-4">
               <button onClick={() => setShowCodePopup(false)} className="text-xs text-red-400 uppercase tracking-widest">Hủy</button>
               <button onClick={verifyCode} className="bg-gradient-to-r from-yellow-600 to-yellow-400 text-red-900 font-bold px-6 py-2 rounded-full shadow-lg">Mở Khóa</button>
             </div>
          </div>
        </div>
      )}

      {/* --- EDIT MODE --- */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex flex-col overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-title text-yellow-500">Thiết Kế Lời Chúc</h2>
              <button onClick={() => setShowEditModal(false)} className="bg-red-900 p-2 rounded-full text-white hover:bg-red-800"><X size={24} /></button>
            </div>

            <div className="space-y-8 max-w-lg mx-auto">
              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-widest mb-2">Tên Chủ Nhân</label>
                <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-4 text-yellow-200 font-title text-xl text-center focus:border-yellow-500 focus:outline-none" />
              </div>

              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-widest mb-2">Nội dung Lời Chúc</label>
                <textarea value={wishContent} onChange={(e) => setWishContent(e.target.value)} className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg p-4 text-white focus:border-yellow-500 focus:outline-none resize-none font-serif text-lg text-center" />
              </div>

              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-widest mb-2">Kiểu Chữ</label>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setWishFont('font-calligraphy')} className={`p-4 rounded-lg border ${wishFont === 'font-calligraphy' ? 'border-yellow-500 bg-red-900/30' : 'border-gray-800 bg-gray-900'} font-calligraphy text-xl`}>Thư Pháp</button>
                  <button onClick={() => setWishFont('font-serif-modern')} className={`p-4 rounded-lg border ${wishFont === 'font-serif-modern' ? 'border-yellow-500 bg-red-900/30' : 'border-gray-800 bg-gray-900'} font-serif-modern text-xl`}>Hiện Đại</button>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-widest mb-2">Màu Sắc</label>
                <div className="flex gap-4 justify-center">
                   {[{id: 'text-yellow-200', bg: 'bg-yellow-200'}, {id: 'text-yellow-500', bg: 'bg-yellow-500'}, {id: 'text-white', bg: 'bg-white'}, {id: 'text-red-400', bg: 'bg-red-400'}].map((color) => (
                     <button key={color.id} onClick={() => setWishColor(color.id)} className={`w-10 h-10 rounded-full ${color.bg} border-4 ${wishColor === color.id ? 'border-gray-500' : 'border-transparent'} shadow-lg transform transition hover:scale-110`} />
                   ))}
                </div>
              </div>

              <button onClick={handleSaveSettings} className="w-full bg-gradient-to-r from-yellow-600 to-yellow-400 text-red-950 font-bold py-4 rounded-lg shadow-lg flex items-center justify-center gap-2 mt-8 active:scale-95 transition-transform"><Save size={20} /> Lưu Thay Đổi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;