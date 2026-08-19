import React, { useState, useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { logEvent } from 'firebase/analytics';
import { auth, analytics } from '../firebase';

interface WorkbenchProps {
  navigate: (path: string) => void;
  user: any;
}

interface Particle {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  size: number;
  freq: number;
  phase: number;
  noise: number;
  scrambleVelocity: number;
  opacity: number;
}

export default function Workbench({ navigate, user }: WorkbenchProps) {
  // Navigation & User
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const userInitials = displayName.trim().split(/\s+/).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  // Tabs & Options
  const [currentTab, setCurrentTab] = useState<'text' | 'image'>('text');
  const [strength, setStrength] = useState<number>(2); // 1 = Light, 2 = Medium, 3 = Aggressive
  
  // Text state
  const [textInput, setTextInput] = useState('');
  const [textOutput, setTextOutput] = useState('');
  const [useHomoglyphs, setUseHomoglyphs] = useState(true);
  const [useZws, setUseZws] = useState(true);
  const [useSynonyms, setUseSynonyms] = useState(true);
  const [isProcessingText, setIsProcessingText] = useState(false);

  // Image state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [srcImgName, setSrcImgName] = useState('');
  const [srcImgSize, setSrcImgSize] = useState('');
  const [srcPreviewUrl, setSrcPreviewUrl] = useState('');
  const [destPreviewUrl, setDestPreviewUrl] = useState('');
  const [useFft, setUseFft] = useState(true);
  const [useJpeg, setUseJpeg] = useState(true);
  const [useBlur, setUseBlur] = useState(true);
  const [useJitter, setUseJitter] = useState(true);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Image comparison slider state
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isSliderDragging, setIsSliderDragging] = useState(false);
  const sliderContainerRef = useRef<HTMLDivElement | null>(null);

  // Telemetry state
  const [itemsPurifiedCount, setItemsPurifiedCount] = useState(0);
  const [scrambleEntropy, setScrambleEntropy] = useState('0.0%');
  const [detectionRisk, setDetectionRisk] = useState('DORMANT');
  const [visualQuality, setVisualQuality] = useState('100.0%');

  // Canvas Spectrograph State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasStatus, setCanvasStatus] = useState<'IDLE' | 'SCRAMBLING' | 'SECURED'>('IDLE');
  const dotsRef = useRef<Particle[]>([]);
  const signalIntensityRef = useRef(0.3);

  // Modal & Toast
  const [starModalOpen, setStarModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Track page view
  useEffect(() => {
    if (analytics) {
      logEvent(analytics, 'page_view', { page_title: 'Workbench', page_location: '/workbench' });
    }
  }, []);

  // Toast trigger helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Sign out handler
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('refine_token');
      localStorage.removeItem('refine_username');
      localStorage.removeItem('refine_email');
      triggerToast("Logged out successfully.");
      setTimeout(() => navigate('/'), 1000);
    } catch (err) {
      console.error(err);
      triggerToast("Sign out failed.");
    }
  };

  // Canvas Spectrograph Setup & Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const rows = 12;
    const cols = 16;

    const initSpectrograph = () => {
      if (!canvas) return;
      const w = canvas.width = canvas.offsetWidth;
      const h = canvas.height = canvas.offsetHeight;
      const cellW = w / cols;
      const cellH = h / rows;

      dotsRef.current = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          dotsRef.current.push({
            baseX: c * cellW + cellW / 2,
            baseY: r * cellH + cellH / 2,
            x: c * cellW + cellW / 2,
            y: r * cellH + cellH / 2,
            size: 1 + Math.random() * 2,
            freq: 0.02 + Math.random() * 0.05,
            phase: Math.random() * Math.PI * 2,
            noise: 0,
            scrambleVelocity: 0,
            opacity: 0.15 + Math.random() * 0.3
          });
        }
      }
    };

    const drawSpectrograph = (time: number) => {
      if (!canvas || !ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = 'rgba(12, 13, 21, 0.2)'; // Fading trail
      ctx.fillRect(0, 0, w, h);

      // Grid guides
      ctx.strokeStyle = 'rgba(30, 33, 50, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < cols; i++) {
        const x = (w / cols) * i;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let i = 0; i < rows; i++) {
        const y = (h / rows) * i;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Draw dots
      dotsRef.current.forEach(dot => {
        const amplitude = 3 * signalIntensityRef.current;
        dot.noise = Math.sin(time * dot.freq + dot.phase) * amplitude;

        if (dot.scrambleVelocity > 0.1) {
          dot.x += (Math.random() - 0.5) * dot.scrambleVelocity;
          dot.y += (Math.random() - 0.5) * dot.scrambleVelocity;
          dot.scrambleVelocity *= 0.95;
          dot.opacity = 0.7;
        } else {
          dot.x += (dot.baseX - dot.x) * 0.1;
          dot.y += (dot.baseY - dot.y) * 0.1;
          dot.opacity += (0.2 - dot.opacity) * 0.05;
        }

        const gradVal = Math.sin(dot.phase + time * 0.01);
        let color = '#489EB5'; // Default techblue
        if (dot.scrambleVelocity > 1) {
          color = '#C86B45'; // Rust
        } else if (gradVal > 0.5) {
          color = '#E6C887'; // Electrum
        }

        ctx.beginPath();
        ctx.arc(dot.x, dot.y + dot.noise, dot.size + (dot.scrambleVelocity * 0.15), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = Math.max(0.1, dot.opacity);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      animationFrameId = requestAnimationFrame(drawSpectrograph);
    };

    initSpectrograph();
    drawSpectrograph(0);

    const handleResize = () => initSpectrograph();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Update resting signal rate on strength change
  useEffect(() => {
    signalIntensityRef.current = 0.15 + (strength * 0.15);
  }, [strength]);

  // Spectrograph animation trigger
  const triggerScrambleAnimation = (intensity: number) => {
    setCanvasStatus('SCRAMBLING');
    signalIntensityRef.current = 2.0 * intensity;
    dotsRef.current.forEach(dot => {
      dot.scrambleVelocity = 15 * intensity;
    });

    setTimeout(() => {
      signalIntensityRef.current = 0.15 + (strength * 0.15);
      setCanvasStatus('SECURED');
    }, 1200);
  };

  // Text Purification
  const handlePurifyText = async () => {
    if (!textInput.trim()) {
      triggerToast("Please enter some text to sanitize.");
      return;
    }

    setIsProcessingText(true);
    triggerScrambleAnimation(strength / 3.0);

    const strengthVal = ["light", "medium", "aggressive"][strength - 1];
    const payload = {
      text: textInput,
      strength: strengthVal,
      use_homoglyphs: useHomoglyphs,
      use_zws: useZws,
      use_synonyms: useSynonyms
    };

    try {
      const response = await fetch('/api/purify/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Server processed request unsuccessfully.");
      const data = await response.json();

      setTextOutput(data.purified_text);
      setItemsPurifiedCount(prev => prev + 1);
      setScrambleEntropy(data.metrics.scramble_rate);
      setVisualQuality(data.metrics.visual_preservation);
      setDetectionRisk(data.metrics.watermark_risk);

      triggerToast("Text sanitization completed successfully.");
    } catch (err) {
      console.error(err);
      triggerToast("Error processing text. Check local logs.");
    } finally {
      setIsProcessingText(false);
    }
  };

  const copyTextToClipboard = () => {
    if (!textOutput) {
      triggerToast("No text available to copy.");
      return;
    }
    navigator.clipboard.writeText(textOutput);
    triggerToast("Clean text copied to clipboard.");
  };

  // Image Upload handlers
  const handleImageLoad = (file: File) => {
    setSelectedFile(file);
    setSrcImgName(file.name);
    setSrcImgSize(`${(file.size / 1024).toFixed(1)} KB`);

    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        const srcData = evt.target.result as string;
        setSrcPreviewUrl(srcData);
        setDestPreviewUrl(srcData); // Reset comparison
        triggerToast("Image loaded onto workbench.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageLoad(file);
  };

  // Image Purifying
  const handlePurifyImage = async () => {
    if (!selectedFile) {
      triggerToast("Please upload an image first.");
      return;
    }

    setIsProcessingImage(true);
    triggerScrambleAnimation(strength / 3.0);

    const strengthVal = ["light", "medium", "aggressive"][strength - 1];
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("strength", strengthVal);
    formData.append("use_fft", String(useFft));
    formData.append("use_jpeg", String(useJpeg));
    formData.append("use_blur", String(useBlur));
    formData.append("use_jitter", String(useJitter));

    try {
      const response = await fetch('/api/purify/image', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error("Image scrambler API processing failed.");
      const data = await response.json();

      setDestPreviewUrl(data.purified_image_base64);
      setItemsPurifiedCount(prev => prev + 1);
      setScrambleEntropy(data.metrics.scramble_factor);
      setVisualQuality(data.metrics.quality_retention);
      setDetectionRisk(data.metrics.watermark_risk);

      triggerToast("Grid pattern scrambled. Image sanitized.");
    } catch (err) {
      console.error(err);
      triggerToast("Error processing image. Verify image constraints.");
    } finally {
      setIsProcessingImage(false);
    }
  };

  // Image comparison dragging logic
  const handleSliderMove = (clientX: number) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isSliderDragging) return;
      handleSliderMove(e.clientX);
    };

    const handleGlobalMouseUp = () => {
      setIsSliderDragging(false);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isSliderDragging]);

  return (
    <div className="flex-1 flex flex-col bg-obsidian text-gray-200">
      {/* Top Navbar */}
      <header className="border-b border-leadlight bg-lead/75 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10 select-none">
        <div className="flex items-center space-x-3">
          <button onClick={() => navigate('/')} className="w-8 h-8 rounded border border-electrum hover:border-rust flex items-center justify-center font-display text-electrum hover:text-rust font-bold text-lg select-none transition-colors">
            R
          </button>
          <div>
            <h1 className="font-display font-bold text-lg tracking-wide text-gray-100 flex items-center">
              <button onClick={() => navigate('/')} className="hover:text-electrum transition-colors">REFINE</button>
              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-mono font-medium border border-rust text-rust rounded">V1.0</span>
            </h1>
            <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">AI watermark & provenance scrambler</p>
          </div>
        </div>

        <div className="flex items-center space-x-4 font-mono text-xs">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-electrum transition-colors hidden sm:inline uppercase tracking-wider text-[11px]">
            ← Home
          </button>
          <a href="https://github.com/askabouthasheem/refine" target="_blank" rel="noreferrer"
             className="hidden sm:flex items-center gap-1.5 border border-leadlight hover:border-electrum text-gray-400 hover:text-electrum px-3 py-1.5 rounded text-[11px] font-mono uppercase tracking-wider transition-colors">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
            GitHub
          </a>
          <span className="hidden md:flex items-center gap-2 px-2 py-1 border border-leadlight rounded text-[9px] font-mono text-techblue uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-techblue animate-pulse"></span>MIT · All Unlocked
          </span>

          {/* User badge */}
          <div className="flex items-center space-x-2 border-l border-leadlight pl-4">
            <div className="w-7 h-7 rounded-full bg-leadlight border border-electrum flex items-center justify-center font-display text-[10px] font-bold text-electrum select-none uppercase">
              {userInitials}
            </div>
            <div className="hidden sm:block text-left text-[10px] font-mono leading-none">
              <div className="text-gray-200 font-bold">{displayName}</div>
              <button onClick={handleSignOut} className="text-rust hover:text-white transition-colors uppercase tracking-wider mt-1 text-[9px] block">
                Sign Out
              </button>
            </div>
          </div>

          <div className="hidden lg:flex items-center space-x-2 border-l border-leadlight pl-4">
            <span className="text-gray-400">SECURITY: <span className="text-electrum font-semibold">SECURE</span></span>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Telemetry Sidebar */}
        <aside className="w-full lg:w-80 border-r border-leadlight bg-lead p-6 flex flex-col justify-between overflow-y-auto shrink-0 space-y-6">
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xs font-semibold text-electrum uppercase tracking-wider">Telemetry Card</h2>
              <p className="text-xs text-gray-400 mt-1">Live metrics of current workspace purification.</p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 font-mono">
              <div className="border border-leadlight bg-obsidian p-4 rounded relative overflow-hidden">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Objects Purified</div>
                <div className="text-2xl font-bold text-electrum mt-1">{itemsPurifiedCount}</div>
              </div>
              <div className="border border-leadlight bg-obsidian p-4 rounded relative overflow-hidden">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Scramble Entropy</div>
                <div className="text-2xl font-bold text-rust mt-1">{scrambleEntropy}</div>
              </div>
              <div className="border border-leadlight bg-obsidian p-4 rounded relative overflow-hidden">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Detection Risk</div>
                <div className="text-sm font-bold text-gray-400 mt-1.5 flex items-center">
                  <span className={`w-2.5 h-2.5 rounded-full mr-2 ${
                    detectionRisk === 'Negligible' ? 'bg-techblue shadow-[0_0_8px_#489EB5]' :
                    detectionRisk === 'Low' ? 'bg-techblue/70' :
                    detectionRisk === 'DORMANT' ? 'bg-gray-500' : 'bg-rust animate-pulse'
                  }`}></span>
                  <span className={
                    detectionRisk === 'Negligible' ? 'text-techblue font-bold' :
                    detectionRisk === 'Low' ? 'text-techblue/80 font-bold' :
                    detectionRisk === 'DORMANT' ? 'text-gray-400' : 'text-rust font-bold'
                  }>{detectionRisk}</span>
                </div>
              </div>
              <div className="border border-leadlight bg-obsidian p-4 rounded relative overflow-hidden">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Visual Quality</div>
                <div className="text-2xl font-bold text-techblue mt-1">{visualQuality}</div>
              </div>
            </div>

            <div className="border-t border-leadlight"></div>

            {/* Tuning slider */}
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-xs font-semibold text-electrum uppercase tracking-wider">Scrambler Engine Tuning</h2>
                <p className="text-[11px] text-gray-400 mt-1">Adjust intensity vs. quality conservation.</p>
              </div>
              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-gray-300 flex justify-between">
                  <span>Process Strength</span>
                  <span className="text-rust font-bold">{["LIGHT", "MEDIUM", "AGGRESSIVE"][strength - 1]}</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="3" 
                  value={strength}
                  onChange={(e) => setStrength(Number(e.target.value))}
                  className="w-full h-1 bg-obsidian rounded-lg appearance-none cursor-pointer accent-rust focus:outline-none focus:ring-1 focus:ring-electrum"
                />
                <div className="flex justify-between text-[9px] font-mono text-gray-500">
                  <span>LIGHT</span>
                  <span>MEDIUM</span>
                  <span>AGGRESSIVE</span>
                </div>
              </div>
            </div>
          </div>

          {/* Spectrograph Particle Visualizer */}
          <div className="border border-leadlight bg-obsidian p-4 rounded space-y-3 font-mono relative overflow-hidden">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider flex justify-between items-center">
              <span>Spectrograph Canvas</span>
              <span className={`text-[9px] ${canvasStatus === 'SCRAMBLING' ? 'text-rust animate-pulse' : 'text-techblue'}`}>{canvasStatus}</span>
            </div>
            <div className="relative w-full aspect-[4/3] bg-[#0c0d15] rounded border border-leadlight flex items-center justify-center overflow-hidden">
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            </div>
            <p className="text-[9px] text-gray-400 leading-tight">Simulates raw signal frequency distribution. Disruption patterns animate during live sanitizing.</p>
          </div>
        </aside>

        {/* Right workspace panels */}
        <main className="flex-1 flex flex-col bg-obsidian overflow-hidden">
          {/* Tabs header */}
          <div className="border-b border-leadlight bg-lead flex justify-between items-center px-6">
            <nav className="flex space-x-6">
              <button 
                onClick={() => { setCurrentTab('text'); triggerToast("Switched to text bench."); }}
                className={`py-4 px-1 text-sm font-display font-semibold transition-colors duration-150 flex items-center border-b-2 ${
                  currentTab === 'text' ? 'border-electrum text-electrum' : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                TEXT PURIFIER
              </button>
              <button 
                onClick={() => { setCurrentTab('image'); triggerToast("Switched to image bench."); }}
                className={`py-4 px-1 text-sm font-display font-semibold transition-colors duration-150 flex items-center border-b-2 ${
                  currentTab === 'image' ? 'border-electrum text-electrum' : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                IMAGE PURIFIER
              </button>
            </nav>
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest hidden sm:inline">Workbench Area // Sandbox</span>
          </div>

          {/* Workbench Tabs content */}
          <div className="flex-1 overflow-y-auto p-6">
            {currentTab === 'text' ? (
              /* Text Purifier Tab */
              <section className="space-y-6 h-full flex flex-col justify-between">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 flex-1 min-h-[300px]">
                  {/* Input area */}
                  <div className="flex flex-col space-y-3">
                    <label className="text-xs font-mono uppercase tracking-wider text-gray-300 flex justify-between">
                      <span>Input Text</span>
                      <span className="text-gray-500">{textInput.length} characters</span>
                    </label>
                    <textarea 
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Paste AI generated text here..." 
                      className="flex-1 w-full bg-lead border border-leadlight rounded p-4 font-mono text-sm text-gray-200 focus:outline-none focus:border-electrum focus:ring-1 focus:ring-electrum resize-none min-h-[250px]"
                    />
                  </div>
                  {/* Output area */}
                  <div className="flex flex-col space-y-3">
                    <label className="text-xs font-mono uppercase tracking-wider text-gray-300 flex justify-between">
                      <span>Sanitized Output</span>
                      <span className="text-gray-500">{textOutput.length} characters</span>
                    </label>
                    <div className="relative flex-1 flex flex-col">
                      <textarea 
                        readOnly 
                        value={textOutput}
                        placeholder="Scrambled clean output will appear here..." 
                        className="flex-1 w-full bg-lead border border-leadlight rounded p-4 font-mono text-sm text-gray-200 focus:outline-none resize-none min-h-[250px] cursor-text"
                      />
                      <button 
                        onClick={copyTextToClipboard}
                        className="absolute bottom-3 right-3 bg-obsidian hover:bg-leadlight border border-leadlight hover:border-electrum text-electrum hover:text-white px-3 py-1.5 rounded text-xs font-mono flex items-center transition-colors duration-150"
                      >
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                        Copy Clean
                      </button>
                    </div>
                  </div>
                </div>

                {/* Text Scrambler options */}
                <div className="bg-lead border border-leadlight p-5 rounded mt-6 space-y-4">
                  <div>
                    <h3 className="font-display text-xs font-semibold text-electrum uppercase tracking-wider">Text Scrambler Options</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Toggle specific obfuscation mechanisms.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="flex items-start space-x-3 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={useHomoglyphs}
                        onChange={(e) => setUseHomoglyphs(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded text-rust border-leadlight bg-obsidian focus:ring-0 focus:ring-offset-0 accent-rust"
                      />
                      <div>
                        <span className="text-xs font-semibold text-gray-200 font-mono">Unicode Homoglyphs</span>
                        <p className="text-[10px] text-gray-400 mt-0.5">Swaps Latin letters with identical Cyrillic characters to break tokenizers.</p>
                      </div>
                    </label>
                    <label className="flex items-start space-x-3 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={useZws}
                        onChange={(e) => setUseZws(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded text-rust border-leadlight bg-obsidian focus:ring-0 focus:ring-offset-0 accent-rust"
                      />
                      <div>
                        <span className="text-xs font-semibold text-gray-200 font-mono">Zero-Width Interspersion</span>
                        <p className="text-[10px] text-gray-400 mt-0.5">Injects invisible spacing characters to disrupt classifier n-gram lookups.</p>
                      </div>
                    </label>
                    <label className="flex items-start space-x-3 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={useSynonyms}
                        onChange={(e) => setUseSynonyms(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded text-rust border-leadlight bg-obsidian focus:ring-0 focus:ring-offset-0 accent-rust"
                      />
                      <div>
                        <span className="text-xs font-semibold text-gray-200 font-mono">Linguistic Synonym Mapping</span>
                        <p className="text-[10px] text-gray-400 mt-0.5">Replaces signature phrase structure and terms with natural synonyms.</p>
                      </div>
                    </label>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button 
                      onClick={handlePurifyText}
                      disabled={isProcessingText}
                      className="bg-rust hover:bg-opacity-90 border border-transparent text-white px-6 py-2.5 rounded text-xs font-mono font-bold tracking-wider uppercase transition-colors duration-150 shadow-md disabled:opacity-50"
                    >
                      {isProcessingText ? "PROCESSING..." : "Execute Sanitization"}
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              /* Image Purifier Tab */
              <section className="space-y-6 h-full flex flex-col justify-between">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1">
                  {/* Upload zone */}
                  <div className="flex flex-col space-y-3">
                    <label className="text-xs font-mono uppercase tracking-wider text-gray-300">Source Asset</label>
                    <div className="flex-1 min-h-[300px] border-2 border-dashed border-leadlight bg-lead rounded flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:border-electrum transition-colors duration-150 relative">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageFileSelect}
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                      />
                      {!srcPreviewUrl ? (
                        <div className="space-y-4">
                          <div className="w-12 h-12 rounded border border-gray-500 mx-auto flex items-center justify-center text-gray-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-200">Drag & Drop Image</p>
                            <p className="text-xs text-gray-400 mt-1">PNG, JPG, or WEBP up to 10MB</p>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col justify-center items-center">
                          <img className="max-h-[250px] object-contain rounded border border-leadlight" src={srcPreviewUrl} alt="Source preview" />
                          <p className="text-xs font-mono text-electrum mt-3 overflow-hidden text-ellipsis max-w-full">
                            {srcImgName} ({srcImgSize})
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Slider comparison viewer */}
                  <div className="xl:col-span-2 flex flex-col space-y-3">
                    <label className="text-xs font-mono uppercase tracking-wider text-gray-300 flex justify-between">
                      <span>Sanitization Output Workbench</span>
                      {selectedFile && <span className="text-[10px] text-gray-500">Drag central slider to inspect changes</span>}
                    </label>

                    <div 
                      ref={sliderContainerRef}
                      className="flex-1 min-h-[300px] bg-[#0A0B10] border border-leadlight rounded relative overflow-hidden flex items-center justify-center select-none"
                    >
                      {!selectedFile ? (
                        <div className="text-center text-gray-500 p-6 z-0">
                          <p className="text-sm">Upload an image to activate comparison viewer.</p>
                        </div>
                      ) : (
                        <div className="absolute inset-0 w-full h-full">
                          {/* Back image - purified */}
                          <img className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none" src={destPreviewUrl} alt="Purified" />

                          {/* Front image - original (clipped) */}
                          <div 
                            className="absolute top-0 left-0 w-full h-full pointer-events-none"
                            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                          >
                            <img className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none" src={srcPreviewUrl} alt="Original" />
                          </div>

                          {/* Interactive slider line */}
                          <div 
                            style={{ left: `${sliderPosition}%` }}
                            className="comparison-slider"
                            onMouseDown={() => setIsSliderDragging(true)}
                            onTouchStart={() => setIsSliderDragging(true)}
                          >
                            <div className="comparison-handle select-none">◂▸</div>
                          </div>

                          {/* Badges */}
                          <span className="absolute top-3 left-3 bg-obsidian/75 backdrop-blur-md px-2 py-0.5 text-[9px] font-mono text-gray-400 border border-leadlight rounded select-none z-10 pointer-events-none">ORIGINAL</span>
                          <span className="absolute top-3 right-3 bg-obsidian/75 backdrop-blur-md px-2 py-0.5 text-[9px] font-mono text-electrum border border-leadlight rounded select-none z-10 pointer-events-none">PURIFIED</span>

                          {/* Download Button */}
                          {destPreviewUrl !== srcPreviewUrl && (
                            <a 
                              href={destPreviewUrl}
                              download={`purified_${srcImgName}`}
                              className="absolute bottom-3 right-3 bg-rust hover:bg-opacity-95 text-white border border-transparent px-4 py-2 rounded text-xs font-mono font-bold uppercase flex items-center transition-colors duration-150 shadow-lg z-10"
                            >
                              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                              Download Purified
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Image control options */}
                <div className="bg-lead border border-leadlight p-5 rounded mt-6 space-y-4">
                  <div>
                    <h3 className="font-display text-xs font-semibold text-electrum uppercase tracking-wider">Spectral & Spatial Scrambler Options</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Toggle and configure image scrambling techniques.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <label className="flex items-start space-x-3 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={useFft} 
                        onChange={(e) => setUseFft(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded text-rust border-leadlight bg-obsidian focus:ring-0 focus:ring-offset-0 accent-rust" 
                      />
                      <div>
                        <span className="text-xs font-semibold text-gray-200 font-mono">FFT Phase Scrambler</span>
                        <p className="text-[10px] text-gray-400 mt-0.5">Perturbs high frequency phase maps where digital watermarks reside.</p>
                      </div>
                    </label>
                    <label className="flex items-start space-x-3 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={useJpeg} 
                        onChange={(e) => setUseJpeg(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded text-rust border-leadlight bg-obsidian focus:ring-0 focus:ring-offset-0 accent-rust" 
                      />
                      <div>
                        <span className="text-xs font-semibold text-gray-200 font-mono">DCT Compression Cycle</span>
                        <p className="text-[10px] text-gray-400 mt-0.5">Passes image through lossy compression to break grid-level signatures.</p>
                      </div>
                    </label>
                    <label className="flex items-start space-x-3 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={useBlur} 
                        onChange={(e) => setUseBlur(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded text-rust border-leadlight bg-obsidian focus:ring-0 focus:ring-offset-0 accent-rust" 
                      />
                      <div>
                        <span className="text-xs font-semibold text-gray-200 font-mono">Bilateral Smoothing</span>
                        <p className="text-[10px] text-gray-400 mt-0.5">Preserves edges while filtering out sub-pixel watermarking fluctuations.</p>
                      </div>
                    </label>
                    <label className="flex items-start space-x-3 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={useJitter} 
                        onChange={(e) => setUseJitter(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded text-rust border-leadlight bg-obsidian focus:ring-0 focus:ring-offset-0 accent-rust" 
                      />
                      <div>
                        <span className="text-xs font-semibold text-gray-200 font-mono">Sub-pixel Micro-jitter</span>
                        <p className="text-[10px] text-gray-400 mt-0.5">Applies micro-scaling and rotational shifts to decouple spatial grids.</p>
                      </div>
                    </label>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button 
                      onClick={handlePurifyImage}
                      disabled={isProcessingImage}
                      className="bg-rust hover:bg-opacity-90 border border-transparent text-white px-6 py-2.5 rounded text-xs font-mono font-bold tracking-wider uppercase transition-colors duration-150 shadow-md disabled:opacity-50"
                    >
                      {isProcessingImage ? "SCRAMBLING PIXELS..." : "Scramble Grid Pattern"}
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>

      {/* Star Modal */}
      {starModalOpen && (
        <div className="fixed inset-0 bg-obsidian/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-lead border border-electrum w-full max-w-md rounded-lg overflow-hidden shadow-2xl relative font-mono text-xs text-gray-200">
            <button onClick={() => setStarModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white text-lg">×</button>
            <div className="p-8 space-y-6 text-center">
              <div className="text-4xl select-none text-electrum">★</div>
              <div className="space-y-2">
                <h3 className="font-display font-bold text-base text-electrum uppercase tracking-wider">Refine is Free & Open-Source</h3>
                <p className="text-[11px] text-gray-400 leading-relaxed">Everything is already unlocked. No subscription needed. If Refine has been useful to you, consider starring the repo or sponsoring the contributors.</p>
              </div>
              <div className="space-y-3">
                <a href="https://github.com/askabouthasheem/refine" target="_blank" rel="noreferrer"
                   className="flex items-center justify-center gap-2 w-full bg-obsidian border border-leadlight hover:border-electrum text-electrum px-6 py-3 rounded text-xs font-bold uppercase tracking-wider transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                  Star on GitHub
                </a>
                <button onClick={() => setStarModalOpen(false)} className="w-full text-gray-500 hover:text-gray-300 py-2 text-[10px] uppercase tracking-widest transition-colors">
                  Back to Workbench
                </button>
              </div>
              <p className="text-[9px] text-gray-600">MIT Licensed · All features free forever · No account required</p>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification System */}
      <div className={`fixed bottom-6 left-6 bg-lead border border-electrum px-4 py-3 rounded shadow-2xl flex items-center space-x-3 text-xs font-mono transform transition-all duration-300 z-50 ${showToast ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-electrum animate-ping"></span>
        <span className="text-gray-100">{toastMessage}</span>
      </div>
    </div>
  );
}
