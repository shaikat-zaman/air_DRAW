import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';

const App = () => {
  const webcamRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  const trackingCanvasRef = useRef(null);
  const prevPos = useRef(null);
  const [showPanel, setShowPanel] = useState(true);

  // 7 second por panel hide korar logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPanel(false);
    }, 7000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const Hands = window.Hands;
    const Camera = window.Camera;
    if (!Hands || !Camera) return;

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.8,
      minTrackingConfidence: 0.8,
    });

    const HAND_CONNECTIONS = [
      [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
      [5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],
      [13,17],[0,17],[17,18],[18,19],[19,20]
    ];

    hands.onResults((results) => {
      const drawCanvas = drawingCanvasRef.current;
      const trackCanvas = trackingCanvasRef.current;
      const drawCtx = drawCanvas.getContext('2d');
      const trackCtx = trackCanvas.getContext('2d');

      if (drawCanvas.width !== window.innerWidth) {
        drawCanvas.width = window.innerWidth;
        drawCanvas.height = window.innerHeight;
        trackCanvas.width = window.innerWidth;
        trackCanvas.height = window.innerHeight;
      }

      trackCtx.clearRect(0, 0, trackCanvas.width, trackCanvas.height);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

        // Drawing Skeleton with Neon Glow
        trackCtx.lineWidth = 3;
        trackCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        trackCtx.shadowBlur = 10;
        trackCtx.shadowColor = "#ffffff";

        HAND_CONNECTIONS.forEach(([start, end]) => {
          const x1 = (1 - landmarks[start].x) * trackCanvas.width;
          const y1 = landmarks[start].y * trackCanvas.height;
          const x2 = (1 - landmarks[end].x) * trackCanvas.width;
          const y2 = landmarks[end].y * trackCanvas.height;
          trackCtx.beginPath();
          trackCtx.moveTo(x1, y1);
          trackCtx.lineTo(x2, y2);
          trackCtx.stroke();
        });

        for (let i = 0; i < landmarks.length; i++) {
          const x = (1 - landmarks[i].x) * trackCanvas.width;
          const y = landmarks[i].y * trackCanvas.height;
          trackCtx.beginPath();
          trackCtx.arc(x, y, 5, 0, 2 * Math.PI);
          trackCtx.fillStyle = '#f8fafc';
          trackCtx.fill();
        }

        // --- Logic Updates ---
        const isIndexUp = landmarks[8].y < landmarks[6].y;
        const isMiddleUp = landmarks[12].y < landmarks[10].y;
        const isRingUp = landmarks[16].y < landmarks[14].y;
        const isPinkyUp = landmarks[20].y < landmarks[18].y;

        const getX = (id) => (1 - landmarks[id].x) * drawCanvas.width;
        const getY = (id) => landmarks[id].y * drawCanvas.height;

        // ✋ PALM = Eraser
        if (isIndexUp && isMiddleUp && isRingUp && isPinkyUp) {
          erase(drawCtx, getX(8), getY(8));
          showCursor(trackCtx, getX(8), getY(8), 'rgba(255,255,255,0.5)', 50);
        }
        // ☝️ INDEX = Green
        else if (isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
          draw(drawCtx, getX(8), getY(8), '#22c55e', 10);
          showCursor(trackCtx, getX(8), getY(8), '#22c55e', 15);
        }
        // 🖕 MIDDLE = Red
        else if (!isIndexUp && isMiddleUp && !isRingUp && !isPinkyUp) {
          draw(drawCtx, getX(12), getY(12), '#ef4444', 10);
          showCursor(trackCtx, getX(12), getY(12), '#ef4444', 15);
        }
        else {
          prevPos.current = null;
        }
      } else {
        prevPos.current = null;
      }
    });

    if (typeof webcamRef.current !== "undefined" && webcamRef.current !== null) {
      const camera = new Camera(webcamRef.current.video, {
        onFrame: async () => {
          if (webcamRef.current && webcamRef.current.video) {
            await hands.send({ image: webcamRef.current.video });
          }
        },
        width: 1280,
        height: 720,
      });
      camera.start();
    }
  }, []);

  const draw = (ctx, x, y, color, thickness) => {
    ctx.globalCompositeOperation = "source-over";
    ctx.shadowBlur = 0;
    if (prevPos.current) {
      ctx.beginPath();
      ctx.moveTo(prevPos.current.x, prevPos.current.y);
      ctx.lineTo(x, y);
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.lineCap = "round";
      ctx.stroke();
    }
    prevPos.current = { x, y };
  };

  const erase = (ctx, x, y) => {
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 50, 0, Math.PI * 2);
    ctx.fill();
    prevPos.current = null;
  };

  const showCursor = (ctx, x, y, color, size) => {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();
  };

  return (
    <div className="relative w-screen h-screen bg-[#0f172a] overflow-hidden font-sans">
      {/* Live Camera */}
      <Webcam 
        ref={webcamRef} 
        className="absolute inset-0 w-full h-full object-cover z-10 opacity-70 grayscale-[0.1]" 
        mirrored={true} 
      />
      
      {/* Drawing Canvas */}
      <canvas ref={drawingCanvasRef} className="absolute inset-0 w-full h-full z-20 pointer-events-none" />
      
      {/* Tracking Canvas (Skeleton) */}
      <canvas ref={trackingCanvasRef} className="absolute inset-0 w-full h-full z-30 pointer-events-none" />

      {/* Professional Minimalist Panel (Size choto kora hoyeche ebong fade animation add kora hoyeche) */}
      <div className={`absolute top-6 left-6 z-40 pro-glass-panel p-5 w-[280px] transition-opacity duration-1000 ease-out ${showPanel ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        
        <div className="mb-4 border-b border-white/20 pb-3">
          <h2 className="text-lg font-bold tracking-wide text-white-forced uppercase">
            Air Drawing By SZS
          </h2>
        </div>
        
        <div className="space-y-3">
          {/* Index Finger */}
          <div className="pro-list-item">
            <div className="flex items-center gap-3">
              <span className="text-2xl">☝️</span>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white-forced tracking-wide">Index Finger</span>
                <span className="text-[10px] text-white/70 font-semibold uppercase tracking-wider mt-0.5">Green Line</span>
              </div>
            </div>
            <div className="color-dot dot-green"></div>
          </div>

          {/* Middle Finger */}
          <div className="pro-list-item">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🖕</span>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white-forced tracking-wide">Middle Finger</span>
                <span className="text-[10px] text-white/70 font-semibold uppercase tracking-wider mt-0.5">Red Line</span>
              </div>
            </div>
            <div className="color-dot dot-red"></div>
          </div>

          {/* Eraser */}
          <div className="pro-list-item">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✋</span>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white-forced tracking-wide">All Fingers Open</span>
                <span className="text-[10px] text-white/70 font-semibold uppercase tracking-wider mt-0.5">Activates Eraser</span>
              </div>
            </div>
            <div className="px-2 py-1 bg-white/20 rounded border border-white/30 text-[10px] font-bold text-white-forced uppercase tracking-widest">
              Erase
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;