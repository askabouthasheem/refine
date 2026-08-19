import React, { useState, useEffect, useRef } from 'react';
import { logEvent } from 'firebase/analytics';
import { analytics } from '../firebase';

interface LandingProps {
  navigate: (path: string) => void;
}

const thesaurusMap: Record<string, string> = {
  "artificial": "synthetic",
  "system": "framework",
  "generated": "created",
  "important": "crucial",
  "security": "protection",
  "process": "workflow",
  "intelligence": "cognition",
};

export default function Landing({ navigate }: LandingProps) {
  const [demoInput, setDemoInput] = useState("The artificial system generated an important security process.");
  const [demoOutput, setDemoOutput] = useState("");
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [sponsorModalOpen, setSponsorModalOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseXRef = useRef(0);

  // Track page view
  useEffect(() => {
    if (analytics) {
      logEvent(analytics, 'page_view', { page_title: 'Landing', page_location: '/' });
    }
  }, []);

  // Sync Demo Input to Output
  useEffect(() => {
    if (!demoInput.trim()) {
      setDemoOutput("...");
      return;
    }
    const words = demoInput.split(' ');
    const processed = words.map(word => {
      const clean = word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const punct = word.replace(/[a-zA-Z0-9]/g, '');
      if (thesaurusMap[clean]) {
        let syn = thesaurusMap[clean];
        if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
          syn = syn.charAt(0).toUpperCase() + syn.slice(1);
        }
        return syn + punct;
      }
      return word;
    });
    setDemoOutput(processed.join(' '));
  }, [demoInput]);

  // Wave Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lines: Array<{
      yRatio: number;
      amplitude: number;
      frequency: number;
      phase: number;
      color: string;
    }> = [];

    const initWaves = () => {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      lines = [];
      for (let i = 0; i < 8; i++) {
        lines.push({
          yRatio: 0.15 + (0.7 / 8) * i,
          amplitude: 15 + Math.random() * 30,
          frequency: 0.003 + Math.random() * 0.005,
          phase: Math.random() * Math.PI,
          color: i % 2 === 0 ? 'rgba(230, 200, 135, 0.15)' : 'rgba(72, 158, 181, 0.15)'
        });
      }
    };

    const drawWaves = (time: number) => {
      if (!canvas || !ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      lines.forEach(line => {
        ctx.beginPath();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 1.5;
        for (let x = 0; x < w; x += 4) {
          let yOff = Math.sin(x * line.frequency + time * 0.002 + line.phase) * line.amplitude;
          const dist = Math.abs(x - mouseXRef.current);
          if (dist < 180) {
            yOff += (Math.random() - 0.5) * 40 * (1 - dist / 180);
            ctx.strokeStyle = 'rgba(200,107,69,0.3)';
          }
          if (x === 0) {
            ctx.moveTo(x, h * line.yRatio + yOff);
          } else {
            ctx.lineTo(x, h * line.yRatio + yOff);
          }
        }
        ctx.stroke();
      });
      animationFrameId = requestAnimationFrame(drawWaves);
    };

    initWaves();
    drawWaves(0);

    const handleResize = () => initWaves();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    mouseXRef.current = e.clientX - r.left;
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const faqs = [
    {
      q: "Is Refine really free? No hidden tiers?",
      a: "Yes, completely. Refine is MIT-licensed, meaning you can use, modify, and redistribute it for free — even commercially. Every algorithm, including FFT phase scrambling and aggressive strength modes, is unlocked for all users by default. There are no premium tiers, no feature gates, and no hidden costs."
    },
    {
      q: "How do invisible watermarks actually work?",
      a: "For images, tools like SynthID embed signatures by making imperceptible pixel-level changes in the frequency domain. For text, LLMs apply a pseudo-random 'green/red' token partition keyed to a secret hash of prior tokens, biasing word selection in a statistically detectable pattern. Detectors then compute the probability of observing the actual token sequence under that partition to determine origin."
    },
    {
      q: "Does any data leave my machine?",
      a: "No. Every operation — image Fourier transforms, JPEG compression cycles, text synonym substitutions — executes inside your local Python process. There are no external API calls, no analytics, and no logging. The app serves from localhost:8000 with no outbound network requests."
    },
    {
      q: "What is the difference between metadata stripping and frequency scrambling?",
      a: "Metadata stripping removes text tags like EXIF or IPTC stored alongside the image file — these are trivially deleted and provide no real provenance guarantee. Invisible watermarks like SynthID are embedded directly into the pixel structure, so deleting metadata does nothing. Refine targets the pixel-level and frequency-domain structures where the actual watermark payload lives."
    },
    {
      q: "Can I contribute new algorithms or language dictionaries?",
      a: "Absolutely. Fork the repo, add your algorithm to app/purifier.py, and open a pull request. The codebase is intentionally minimal and readable so that new contributors can add techniques quickly. Language-specific thesaurus dictionaries, wavelet-domain transforms, and browser-side WASM ports are all welcome."
    }
  ];

  return (
    <div className="flex-1 flex flex-col bg-obsidian text-gray-200 scroll-smooth">
      {/* Header */}
      <header className="border-b border-leadlight bg-lead/75 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded border border-electrum flex items-center justify-center font-display text-electrum font-bold text-lg select-none">R</div>
          <div>
            <h1 className="font-display font-bold text-base tracking-wide text-gray-100 flex items-center gap-2">
              REFINE
            </h1>
            <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">open-source watermark scrambler</p>
          </div>
        </div>
        
        <nav className="hidden md:flex items-center space-x-8 font-mono text-xs uppercase tracking-wider">
          <a href="#how-it-works" className="text-gray-400 hover:text-electrum transition-colors">How It Works</a>
          <a href="#features" className="text-gray-400 hover:text-electrum transition-colors">Features</a>
          <a href="#self-host" className="text-gray-400 hover:text-electrum transition-colors">Self-Host</a>
          <a href="#faq" className="text-gray-400 hover:text-electrum transition-colors">FAQ</a>
        </nav>
        
        <div className="flex items-center gap-4">
          <a href="https://github.com/askabouthasheem/refine" target="_blank" rel="noreferrer" className="hidden sm:flex items-center gap-2 text-gray-400 hover:text-electrum transition-colors font-mono text-xs uppercase tracking-wider">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
            GitHub
          </a>

          <button 
            onClick={() => navigate('/workbench')} 
            className="bg-electrum hover:bg-opacity-90 text-obsidian px-4 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider transition-colors shadow-md"
          >
            Launch App
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden border-b border-leadlight py-24 px-6">
        <canvas 
          ref={canvasRef} 
          onMouseMove={handleMouseMove}
          className="absolute inset-0 w-full h-full opacity-35 z-0 pointer-events-auto"
        />
        
        <div className="max-w-4xl mx-auto text-center z-10 space-y-8 relative pointer-events-none">
          <div className="inline-flex items-center gap-3 border border-leadlight bg-lead/60 px-5 py-1.5 rounded-full font-mono text-[10px] text-gray-300 tracking-wider uppercase backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-techblue animate-pulse shrink-0"></span>
            <span>Free Forever</span>
            <span className="text-gray-600">/</span>
            <span>Self-Hosted</span>
            <span className="text-gray-600">/</span>
            <span className="text-techblue">MIT Licensed</span>
            <span className="text-gray-600">/</span>
            <span>No Telemetry</span>
          </div>
          
          <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-white leading-tight">
            Your content.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-electrum via-rust to-techblue">Your signal. No footprint.</span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-gray-400 leading-relaxed">
            Refine strips invisible AI provenance watermarks from images and text using Fourier phase perturbation, Unicode homoglyph substitution, and zero-width character injection — all running locally on your machine. No accounts needed. No cloud. No cost.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4 pointer-events-auto">
            <button onClick={() => navigate('/workbench')} className="w-full sm:w-auto bg-electrum hover:bg-opacity-90 text-obsidian px-10 py-4 rounded text-xs font-mono font-bold uppercase tracking-widest transition-colors shadow-lg text-center">
              Open the Workbench — Free
            </button>
            <a href="#self-host" className="w-full sm:w-auto bg-lead border border-leadlight hover:border-electrum text-gray-300 px-10 py-4 rounded text-xs font-mono font-bold uppercase tracking-widest transition-colors text-center">
              Self-Host in 30 Seconds
            </a>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 animate-bounce pointer-events-none">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 border-b border-leadlight bg-lead">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-3">
            <h2 className="font-display text-2xl sm:text-4xl font-bold text-white tracking-tight">How Watermarks Are Scrambled</h2>
            <p className="text-xs sm:text-sm text-gray-400 max-w-2xl mx-auto">Every operation runs in your local Python process. Nothing is sent anywhere.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Interactive Live Sandbox */}
            <div className="space-y-4">
              <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block">Live Text Demo — Type anything</label>
              <input 
                type="text" 
                value={demoInput}
                onChange={(e) => setDemoInput(e.target.value)}
                className="w-full bg-obsidian border border-leadlight rounded p-4 font-mono text-sm text-gray-200 focus:outline-none focus:border-electrum"
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-obsidian border border-leadlight rounded p-4 space-y-2">
                  <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Original</div>
                  <div className="font-mono text-xs text-gray-400 leading-relaxed break-all">{demoInput}</div>
                </div>
                <div className="bg-obsidian border border-electrum/30 rounded p-4 space-y-2 relative">
                  <div className="text-[9px] font-mono text-electrum uppercase tracking-widest">Scrambled</div>
                  <div className="font-mono text-xs text-electrum leading-relaxed break-all">{demoOutput}</div>
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[8px] font-mono border border-techblue text-techblue rounded animate-pulse">LIVE</span>
                </div>
              </div>
              <p className="text-[10px] text-gray-500 font-mono">Synonym swaps make the text visually identical but statistically distinct from the watermarked distribution.</p>
            </div>

            {/* Steps */}
            <div className="space-y-6">
              <div className="flex gap-5 items-start">
                <div className="w-8 h-8 shrink-0 rounded border border-electrum flex items-center justify-center font-mono text-electrum text-xs font-bold">1</div>
                <div>
                  <h3 className="font-display font-semibold text-white text-sm">Detect the watermark type</h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">Refine identifies whether the content carries pixel-level frequency watermarks (SynthID) or token-probability signatures embedded in AI text output.</p>
                </div>
              </div>
              <div className="flex gap-5 items-start">
                <div className="w-8 h-8 shrink-0 rounded border border-rust flex items-center justify-center font-mono text-rust text-xs font-bold">2</div>
                <div>
                  <h3 className="font-display font-semibold text-white text-sm">Apply targeted perturbations</h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">For images: 2D FFT phase noise injected at frequencies above the threshold distance from the DC component. For text: homoglyph replacement and ZWS insertion disrupt n-gram classifiers.</p>
                </div>
              </div>
              <div className="flex gap-5 items-start">
                <div className="w-8 h-8 shrink-0 rounded border border-techblue flex items-center justify-center font-mono text-techblue text-xs font-bold">3</div>
                <div>
                  <h3 className="font-display font-semibold text-white text-sm">Reconstruct with quality intact</h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">The inverse FFT reconstructs the image. Text remains human-readable. The scrambled content is indistinguishable to a human reader but statistically de-coupled from the original watermark.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-6 border-b border-leadlight">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-3">
            <h2 className="font-display text-2xl sm:text-4xl font-bold text-white tracking-tight">Everything. Unlocked. Free.</h2>
            <p className="text-xs sm:text-sm text-gray-400 max-w-xl mx-auto">No tiers, no paywalls. Every algorithm is available to every user by default.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="border border-leadlight bg-lead p-6 rounded space-y-4 hover:border-electrum transition-colors">
              <div className="w-10 h-10 border border-electrum rounded flex items-center justify-center font-display text-electrum font-bold text-sm">FFT</div>
              <h3 className="font-display font-semibold text-base text-white">Fourier Scrambling</h3>
              <p className="text-xs text-gray-400 leading-relaxed">Perturbs high-frequency phase maps. Targets pixel-level embedding coordinates used by SynthID.</p>
            </div>
            <div className="border border-leadlight bg-lead p-6 rounded space-y-4 hover:border-rust transition-colors">
              <div className="w-10 h-10 border border-rust rounded flex items-center justify-center font-display text-rust font-bold text-sm">SYN</div>
              <h3 className="font-display font-semibold text-base text-white">Synonym Mapping</h3>
              <p className="text-xs text-gray-400 leading-relaxed">Replaces watermark-biased tokens with semantically equivalent alternatives from a local thesaurus.</p>
            </div>
            <div className="border border-leadlight bg-lead p-6 rounded space-y-4 hover:border-techblue transition-colors">
              <div className="w-10 h-10 border border-techblue rounded flex items-center justify-center font-display text-techblue font-bold text-sm">ZWS</div>
              <h3 className="font-display font-semibold text-base text-white">Zero-Width Insert</h3>
              <p className="text-xs text-gray-400 leading-relaxed">Injects invisible Unicode characters to fracture n-gram hash chains without changing what you read.</p>
            </div>
            <div className="border border-leadlight bg-lead p-6 rounded space-y-4 hover:border-gray-400 transition-colors">
              <div className="w-10 h-10 border border-gray-500 rounded flex items-center justify-center font-display text-gray-300 font-bold text-sm">JIT</div>
              <h3 className="font-display font-semibold text-base text-white">Spatial Jitter</h3>
              <p className="text-xs text-gray-400 leading-relaxed">Micro-rotation and sub-pixel rescaling decouples pixel alignment from grid-based watermark patterns.</p>
            </div>
          </div>

          <div className="border border-electrum/30 bg-lead/60 rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <p className="font-display font-bold text-white text-lg">All features are fully unlocked.</p>
              <p className="text-xs text-gray-400">FFT scrambling, high-res image support, aggressive strength modes — available to everyone, always.</p>
            </div>
            <button onClick={() => navigate('/workbench')} className="shrink-0 bg-electrum hover:bg-opacity-90 text-obsidian px-6 py-3 rounded text-xs font-mono font-bold uppercase tracking-widest transition-colors">
              Open Workbench
            </button>
          </div>
        </div>
      </section>

      {/* Self Host Guide */}
      <section id="self-host" className="py-20 px-6 border-b border-leadlight bg-lead">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="font-display text-2xl sm:text-4xl font-bold text-white tracking-tight">Self-Host in 30 Seconds</h2>
            <p className="text-xs sm:text-sm text-gray-400 max-w-xl mx-auto">Three ways to run Refine. No Docker account, no registration, no cloud dependency.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Python */}
            <div className="border border-leadlight bg-obsidian rounded p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border border-electrum rounded flex items-center justify-center text-electrum font-mono text-xs font-bold">PY</div>
                <h3 className="font-display font-semibold text-white">Python (pip)</h3>
              </div>
              <div className="bg-lead rounded p-4 font-mono text-xs text-gray-300 space-y-1 leading-loose">
                <div><span className="text-gray-500">$</span> git clone https://github.com/askabouthasheem/refine</div>
                <div><span className="text-gray-500">$</span> pip install -r requirements.txt</div>
                <div><span className="text-gray-500">$</span> python run.py</div>
              </div>
              <p className="text-[10px] text-gray-500 font-mono">Requires Python 3.10+. Runs on http://localhost:8000</p>
            </div>

            {/* Docker */}
            <div className="border border-leadlight bg-obsidian rounded p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border border-techblue rounded flex items-center justify-center text-techblue font-mono text-xs font-bold">🐳</div>
                <h3 className="font-display font-semibold text-white">Docker</h3>
              </div>
              <div className="bg-lead rounded p-4 font-mono text-xs text-gray-300 space-y-1 leading-loose">
                <div><span className="text-gray-500">$</span> docker run -p 8000:8000 \</div>
                <div>&nbsp;&nbsp;--rm refine/refine</div>
                <div className="text-gray-500"># or build from source:</div>
                <div><span className="text-gray-500">$</span> docker build -t refine .</div>
                <div><span className="text-gray-500">$</span> docker run -p 8000:8000 refine</div>
              </div>
              <p className="text-[10px] text-gray-500 font-mono">No Python install needed. Image is ~180 MB.</p>
            </div>

            {/* Venv */}
            <div className="border border-leadlight bg-obsidian rounded p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border border-rust rounded flex items-center justify-center text-rust font-mono text-xs font-bold">ENV</div>
                <h3 className="font-display font-semibold text-white">Virtualenv</h3>
              </div>
              <div className="bg-lead rounded p-4 font-mono text-xs text-gray-300 space-y-1 leading-loose">
                <div><span className="text-gray-500">$</span> git clone https://github.com/askabouthasheem/refine &amp;&amp; cd refine</div>
                <div><span className="text-gray-500">$</span> python -m venv .venv</div>
                <div><span className="text-gray-500">$</span> source .venv/bin/activate</div>
                <div><span className="text-gray-500">$</span> pip install -r requirements.txt</div>
                <div><span className="text-gray-500">$</span> python run.py</div>
              </div>
              <p className="text-[10px] text-gray-500 font-mono">Isolated environment, no global packages.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Community CTA */}
      <section className="py-20 px-6 border-b border-leadlight">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="font-display text-2xl sm:text-4xl font-bold text-white tracking-tight">Built in the Open. Maintained by the Community.</h2>
          <p className="text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">
            Refine is MIT-licensed and maintained by contributors who believe privacy is not a premium feature. Star the repository to support the project, or contribute a new algorithm.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a href="https://github.com/askabouthasheem/refine" target="_blank" rel="noreferrer"
               className="flex items-center justify-center gap-2 border border-electrum text-electrum hover:bg-electrum hover:text-obsidian px-8 py-3.5 rounded text-xs font-mono font-bold uppercase tracking-widest transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
              Star on GitHub
            </a>
            <button onClick={() => setSponsorModalOpen(true)}
               className="flex items-center justify-center gap-2 bg-lead border border-leadlight hover:border-rust text-gray-300 px-8 py-3.5 rounded text-xs font-mono font-bold uppercase tracking-widest transition-colors">
              ♥ Sponsor the Project
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-6 border-b border-leadlight bg-lead">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="font-display text-2xl sm:text-4xl font-bold text-white tracking-tight">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-leadlight bg-obsidian rounded overflow-hidden">
                <button onClick={() => toggleFaq(index)} className="w-full text-left px-6 py-4 font-display font-medium text-sm flex items-center justify-between text-white hover:text-electrum transition-colors">
                  <span>{faq.q}</span>
                  <svg className={`w-4 h-4 transform transition-transform duration-200 shrink-0 ${activeFaq === index ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                {activeFaq === index && (
                  <div className="px-6 pb-5 text-xs text-gray-400 leading-relaxed font-sans border-t border-leadlight/40 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-leadlight bg-lead py-10 px-6 font-mono text-[10px] text-gray-500">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-7 h-7 rounded border border-electrum/50 flex items-center justify-center font-display text-electrum/60 font-bold text-sm select-none">R</div>
            <div>
              <div className="text-gray-300 font-semibold">REFINE</div>
              <div className="text-gray-500">Free & Open-Source · MIT License · 2026 Community Project</div>
            </div>
          </div>
          <div className="flex items-center gap-6 uppercase tracking-widest">
            <a href="https://github.com/askabouthasheem/refine" target="_blank" rel="noreferrer" className="hover:text-electrum transition-colors">GitHub</a>
            <button onClick={() => navigate('/workbench')} className="hover:text-electrum transition-colors">Workbench</button>
            <a href="https://github.com/askabouthasheem/refine/blob/main/LICENSE" target="_blank" rel="noreferrer" className="hover:text-electrum transition-colors">MIT License</a>
            <button onClick={() => navigate('/auth')} className="hover:text-electrum transition-colors">Sign In</button>
          </div>
        </div>
      </footer>

      {/* Sponsor Modal */}
      {sponsorModalOpen && (
        <div className="fixed inset-0 bg-obsidian/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-lead border border-rust w-full max-w-md rounded-lg overflow-hidden shadow-2xl relative font-mono text-xs text-gray-200">
            <button onClick={() => setSponsorModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white text-lg">×</button>
            <div className="p-8 space-y-6 text-center">
              <div className="text-3xl text-rust">♥</div>
              <div className="space-y-2">
                <h3 className="font-display font-bold text-base text-white uppercase tracking-wider">Sponsor Refine</h3>
                <p className="text-[11px] text-gray-400 leading-relaxed">Refine is free forever. If it's been useful to you, consider supporting the contributors who build and maintain it.</p>
              </div>
              <div className="space-y-3">
                <a href="https://github.com/sponsors/askabouthasheem" target="_blank" rel="noreferrer"
                   className="flex items-center justify-center gap-2 w-full bg-obsidian border border-leadlight hover:border-electrum text-electrum px-6 py-3 rounded text-xs font-bold uppercase tracking-wider transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                  GitHub Sponsors
                </a>
              </div>
              <p className="text-[9px] text-gray-600">All features remain free regardless of sponsorship status.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
