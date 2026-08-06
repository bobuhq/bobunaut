import{r as s,j as a}from"./vendor-react-Db_inLa4.js";import{s as w,u as v}from"./index-BRO6E1Mc.js";import{j as _,S as $,T as M,O as A,Z as L,l as S,ae as R,z as k}from"./vendor-icons-JbKY7JUy.js";import"./vendor-C2bh2AFn.js";import"./vendor-supabase-BRUXfWZX.js";import"./vendor-motion-DZA6fOcq.js";const x=e=>{const r=Number(e);return Number.isFinite(r)?r:0},j=e=>({rank:x(e.rank),builderId:e.builder_id,username:e.username,displayName:e.display_name,level:x(e.level),gp:x(e.gp),reputation:x(e.reputation),referralCount:x(e.referral_count)}),N={async loadGlobalLeaderboard(e=50,r=0){const i=Math.min(Math.max(Math.trunc(e),1),100),o=Math.max(Math.trunc(r),0),{data:d,error:n}=await w.rpc("get_global_leaderboard",{p_limit:i,p_offset:o}).returns();if(n)throw n;return(Array.isArray(d)?d:[]).map(j)},async loadMyRank(){const{data:e,error:r}=await w.rpc("get_my_leaderboard_rank").returns();if(r)throw r;const i=Array.isArray(e)?e[0]:null;return i?j(i):null}};function b({value:e,duration:r=1100}){const{language:i}=v(),[o,d]=s.useState(0),n=s.useRef(0);return s.useEffect(()=>{const l=n.current,g=e-l,u=performance.now();let p=0;const m=t=>{const h=t-u,c=Math.min(h/r,1),y=1-Math.pow(1-c,3);d(Math.round(l+g*y)),c<1?p=requestAnimationFrame(m):n.current=e};return p=requestAnimationFrame(m),()=>{cancelAnimationFrame(p)}},[r,e]),a.jsx(a.Fragment,{children:o.toLocaleString(i)})}const B=[[8,49],[17,41],[25,50],[17,59],[8,51],[34,41],[34,59],[42,49],[50,41],[50,59],[59,41],[59,59],[68,49],[77,41],[87,50],[77,59]];function E(){const e=s.useMemo(()=>Array.from({length:58},(i,o)=>{const d=["blue","purple","gold"];return{id:o,top:`${3+o*19%91}%`,left:`${-28+o*37%126}%`,delay:`${o*.31%12}s`,duration:`${2.1+o*11%29/10}s`,length:`${55+o*23%160}px`,tone:d[o%d.length]}}),[]),r=s.useMemo(()=>Array.from({length:22},(i,o)=>({id:o,angle:360/22*o,delay:`${-o*.26}s`,size:3+o%4})),[]);return a.jsxs("div",{className:"leaderboard-cinematic-effects","aria-hidden":"true",children:[a.jsx("style",{children:`
        .leaderboard-cinematic-effects {
          position: absolute;
          inset: 0;
          z-index: -1;
          overflow: hidden;
          pointer-events: none;
        }

        .cinematic-meteor {
          position: absolute;
          top: var(--meteor-top);
          left: var(--meteor-left);
          width: var(--meteor-length);
          height: 2px;
          opacity: 0;
          border-radius: 999px;
          transform: rotate(-25deg);
          will-change: transform, opacity;
          animation:
            cinematic-meteor-flight
            var(--meteor-duration)
            linear
            var(--meteor-delay)
            infinite;
        }

        .cinematic-meteor::after {
          content: "";
          position: absolute;
          top: 50%;
          right: -3px;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          transform: translateY(-50%);
          background: white;
        }

        .cinematic-meteor.blue {
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(78, 181, 255, 0.18),
              rgba(159, 235, 255, 0.98)
            );
          filter:
            drop-shadow(
              0 0 7px rgba(74, 207, 255, 0.95)
            );
        }

        .cinematic-meteor.blue::after {
          box-shadow:
            0 0 8px white,
            0 0 17px #61dfff,
            0 0 30px rgba(62, 145, 255, 0.88);
        }

        .cinematic-meteor.purple {
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(135, 73, 255, 0.18),
              rgba(210, 166, 255, 0.98)
            );
          filter:
            drop-shadow(
              0 0 8px rgba(166, 92, 255, 0.9)
            );
        }

        .cinematic-meteor.purple::after {
          box-shadow:
            0 0 8px white,
            0 0 17px #bd7cff,
            0 0 30px rgba(132, 67, 255, 0.88);
        }

        .cinematic-meteor.gold {
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(255, 166, 62, 0.18),
              rgba(255, 231, 157, 0.98)
            );
          filter:
            drop-shadow(
              0 0 8px rgba(255, 183, 75, 0.92)
            );
        }

        .cinematic-meteor.gold::after {
          box-shadow:
            0 0 8px white,
            0 0 17px #ffd072,
            0 0 30px rgba(255, 142, 44, 0.9);
        }

        .cinematic-supernova {
          position: absolute;
          width: 210px;
          height: 210px;
          border-radius: 50%;
          opacity: 0;
          transform: scale(0.05);
          background:
            radial-gradient(
              circle,
              rgba(255, 255, 255, 1) 0 2%,
              rgba(147, 227, 255, 0.92) 3%,
              rgba(126, 83, 255, 0.5) 14%,
              rgba(126, 83, 255, 0.08) 35%,
              transparent 68%
            );
          filter:
            drop-shadow(
              0 0 20px rgba(122, 217, 255, 0.95)
            );
          animation:
            cinematic-supernova
            17s
            ease-out
            infinite;
        }

        .cinematic-supernova::before,
        .cinematic-supernova::after {
          content: "";
          position: absolute;
          inset: 50%;
          width: 165%;
          height: 2px;
          transform: translate(-50%, -50%);
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.9),
              transparent
            );
        }

        .cinematic-supernova::after {
          transform:
            translate(-50%, -50%)
            rotate(90deg);
        }

        .cinematic-supernova-one {
          top: 22%;
          right: 13%;
          animation-delay: -3s;
        }

        .cinematic-supernova-two {
          bottom: 16%;
          left: 8%;
          width: 150px;
          height: 150px;
          animation-delay: -11s;
        }

        .cinematic-orbit-system {
          position: absolute;
          right: 4%;
          top: 34%;
          width: 280px;
          height: 280px;
          opacity: 0.58;
          border: 1px solid rgba(120, 210, 255, 0.1);
          border-radius: 50%;
          transform: rotate(-16deg);
          animation:
            cinematic-orbit-spin
            30s
            linear
            infinite;
        }

        .cinematic-orbit-system::before {
          content: "";
          position: absolute;
          inset: 17%;
          border: 1px solid rgba(178, 117, 255, 0.09);
          border-radius: 50%;
        }

        .cinematic-orbit-particle {
          position: absolute;
          top: 50%;
          left: 50%;
          width: var(--particle-size);
          height: var(--particle-size);
          border-radius: 50%;
          transform:
            rotate(var(--particle-angle))
            translateX(138px);
          background: rgba(165, 229, 255, 0.94);
          box-shadow:
            0 0 8px rgba(94, 214, 255, 0.9),
            0 0 16px rgba(121, 86, 255, 0.42);
          animation:
            cinematic-particle-pulse
            2.6s
            ease-in-out
            var(--particle-delay)
            infinite;
        }

        .bobu-constellation {
          position: absolute;
          left: 50%;
          top: 55%;
          width: min(700px, 72vw);
          height: 260px;
          opacity: 0.085;
          transform: translate(-50%, -50%);
          filter:
            drop-shadow(
              0 0 12px rgba(119, 207, 255, 0.7)
            );
          animation:
            bobu-constellation-breathe
            10s
            ease-in-out
            infinite;
        }

        .bobu-constellation-point {
          position: absolute;
          left: var(--point-x);
          top: var(--point-y);
          width: 5px;
          height: 5px;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          background: white;
          box-shadow:
            0 0 9px white,
            0 0 19px rgba(95, 211, 255, 0.95);
        }

        .bobu-constellation-word {
          position: absolute;
          inset: 50% auto auto 50%;
          transform: translate(-50%, -50%);
          color: rgba(177, 225, 255, 0.45);
          font-size: clamp(72px, 13vw, 190px);
          font-weight: 950;
          letter-spacing: 0.16em;
          text-indent: 0.16em;
          text-shadow:
            0 0 35px rgba(94, 185, 255, 0.38);
        }

        .cinematic-universe-pulse {
          position: absolute;
          inset: 0;
          opacity: 0;
          background:
            radial-gradient(
              circle at 50% 40%,
              rgba(114, 99, 255, 0.13),
              transparent 50%
            );
          animation:
            cinematic-universe-pulse
            18s
            ease-in-out
            infinite;
        }

        @keyframes cinematic-meteor-flight {
          0% {
            opacity: 0;
            transform:
              translate3d(-220px, -120px, 0)
              rotate(-25deg)
              scaleX(0.2);
          }

          8% {
            opacity: 0.84;
          }

          62% {
            opacity: 0.72;
          }

          100% {
            opacity: 0;
            transform:
              translate3d(760px, 390px, 0)
              rotate(-25deg)
              scaleX(1);
          }
        }

        @keyframes cinematic-supernova {
          0%, 77% {
            opacity: 0;
            transform: scale(0.04) rotate(0);
          }

          79% {
            opacity: 1;
          }

          82% {
            opacity: 0.92;
            transform: scale(0.75) rotate(8deg);
          }

          87% {
            opacity: 0.36;
            transform: scale(1.28) rotate(15deg);
          }

          93%, 100% {
            opacity: 0;
            transform: scale(1.85) rotate(21deg);
          }
        }

        @keyframes cinematic-orbit-spin {
          to {
            transform: rotate(344deg);
          }
        }

        @keyframes cinematic-particle-pulse {
          0%, 100% {
            opacity: 0.35;
            filter: brightness(0.8);
          }

          50% {
            opacity: 1;
            filter: brightness(1.45);
          }
        }

        @keyframes bobu-constellation-breathe {
          0%, 100% {
            opacity: 0.055;
            transform:
              translate(-50%, -50%)
              scale(0.98);
          }

          50% {
            opacity: 0.11;
            transform:
              translate(-50%, -50%)
              scale(1.025);
          }
        }

        @keyframes cinematic-universe-pulse {
          0%, 75%, 100% {
            opacity: 0;
          }

          84% {
            opacity: 1;
          }

          92% {
            opacity: 0.18;
          }
        }

        @media (max-width: 820px) {
          .cinematic-meteor:nth-of-type(n + 29) {
            display: none;
          }

          .cinematic-orbit-system {
            width: 190px;
            height: 190px;
            right: -70px;
            opacity: 0.38;
          }

          .cinematic-orbit-particle {
            transform:
              rotate(var(--particle-angle))
              translateX(93px);
          }

          .bobu-constellation {
            width: 92vw;
            opacity: 0.055;
          }

          .cinematic-supernova {
            width: 135px;
            height: 135px;
          }
        }

        @media (max-width: 520px) {
          .cinematic-meteor:nth-of-type(n + 19) {
            display: none;
          }

          .cinematic-supernova-two,
          .cinematic-orbit-system {
            display: none;
          }

          .cinematic-supernova {
            opacity: 0;
            width: 105px;
            height: 105px;
          }

          .bobu-constellation-word {
            font-size: 68px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .cinematic-meteor,
          .cinematic-supernova,
          .cinematic-orbit-system,
          .cinematic-orbit-particle,
          .bobu-constellation,
          .cinematic-universe-pulse {
            animation: none !important;
          }

          .cinematic-meteor,
          .cinematic-supernova {
            display: none;
          }
        }
      `}),a.jsx("div",{className:"cinematic-universe-pulse"}),e.map(i=>a.jsx("span",{className:`cinematic-meteor ${i.tone}`,style:{"--meteor-top":i.top,"--meteor-left":i.left,"--meteor-delay":i.delay,"--meteor-duration":i.duration,"--meteor-length":i.length}},i.id)),a.jsx("span",{className:"cinematic-supernova cinematic-supernova-one"}),a.jsx("span",{className:"cinematic-supernova cinematic-supernova-two"}),a.jsx("div",{className:"cinematic-orbit-system",children:r.map(i=>a.jsx("span",{className:"cinematic-orbit-particle",style:{"--particle-angle":`${i.angle}deg`,"--particle-delay":i.delay,"--particle-size":`${i.size}px`}},i.id))}),a.jsxs("div",{className:"bobu-constellation",children:[a.jsx("div",{className:"bobu-constellation-word",children:"BOBU"}),B.map(([i,o],d)=>a.jsx("span",{className:"bobu-constellation-point",style:{"--point-x":`${i}%`,"--point-y":`${o}%`}},`${i}-${o}-${d}`))]})]})}function G({entries:e}){var d;const{t:r}=v(),i=e.reduce((n,l)=>n+l.gp,0),o=((d=e[0])==null?void 0:d.gp)??0;return a.jsxs("section",{className:"leaderboard-stats-grid",children:[a.jsx("style",{children:`
        .leaderboard-stats-grid {
          position: relative;
          z-index: 3;
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin: 0 auto 22px;
        }

        .leaderboard-stat-card {
          display: flex;
          align-items: center;
          min-height: 92px;
          gap: 14px;
          padding: 16px 18px;
          border: 1px solid rgba(139, 159, 255, 0.14);
          border-radius: 21px;
          background:
            linear-gradient(
              145deg,
              rgba(29, 21, 68, 0.74),
              rgba(6, 20, 39, 0.76)
            );
          box-shadow:
            inset 0 1px rgba(255, 255, 255, 0.05),
            0 18px 40px rgba(0, 0, 0, 0.15);
          backdrop-filter: blur(18px);
        }

        .leaderboard-stat-icon {
          display: grid;
          flex: 0 0 46px;
          width: 46px;
          height: 46px;
          place-items: center;
          border: 1px solid rgba(119, 212, 255, 0.19);
          border-radius: 15px;
          color: #77e8ff;
          background:
            rgba(73, 171, 255, 0.075);
          box-shadow:
            0 0 20px rgba(60, 184, 255, 0.08);
        }

        .leaderboard-stat-copy span {
          display: block;
          margin-bottom: 6px;
          color: rgba(207, 214, 249, 0.52);
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .leaderboard-stat-copy strong {
          color: white;
          font-size: clamp(18px, 2.4vw, 25px);
          letter-spacing: -0.04em;
        }

        @media (max-width: 720px) {
          .leaderboard-stats-grid {
            grid-template-columns: 1fr;
          }

          .leaderboard-stat-card {
            min-height: 76px;
          }
        }
      `}),a.jsxs("article",{className:"leaderboard-stat-card",children:[a.jsx("div",{className:"leaderboard-stat-icon",children:a.jsx(_,{size:21})}),a.jsxs("div",{className:"leaderboard-stat-copy",children:[a.jsx("span",{children:r("leaderboard.stats.visibleBuilders")}),a.jsx("strong",{children:a.jsx(b,{value:e.length})})]})]}),a.jsxs("article",{className:"leaderboard-stat-card",children:[a.jsx("div",{className:"leaderboard-stat-icon",children:a.jsx($,{size:21})}),a.jsxs("div",{className:"leaderboard-stat-copy",children:[a.jsx("span",{children:r("leaderboard.stats.top20Gp")}),a.jsxs("strong",{children:[a.jsx(b,{value:i})," GP"]})]})]}),a.jsxs("article",{className:"leaderboard-stat-card",children:[a.jsx("div",{className:"leaderboard-stat-icon",children:a.jsx(M,{size:21})}),a.jsxs("div",{className:"leaderboard-stat-copy",children:[a.jsx("span",{children:r("leaderboard.stats.leadingBuilder")}),a.jsxs("strong",{children:[a.jsx(b,{value:o})," GP"]})]})]})]})}const F=Array.from({length:34},(e,r)=>({id:r,top:`${4+r*17%88}%`,left:`${-22+r*29%118}%`,delay:`${r*.37%8}s`,duration:`${2.4+r*13%24/10}s`,length:`${70+r*19%125}px`,opacity:.42+r*7%50/100})),X=Array.from({length:14},(e,r)=>({id:r,top:`${8+r*31%80}%`,left:`${5+r*43%90}%`,delay:`${r*1.13%9}s`,size:`${50+r*23%110}px`}));function f(e){return e.displayName??e.username??`Builder ${e.builderId.slice(0,6)}`}function z(e){return f(e).split(" ").map(i=>i[0]).join("").slice(0,2).toUpperCase()}function P(e){return e===1?a.jsx(R,{size:22}):e===2?a.jsx(k,{size:21}):e===3?a.jsx(k,{size:21}):a.jsxs("span",{children:["#",e]})}function q(){const{t:e}=v(),[r,i]=s.useState([]),[o,d]=s.useState(null),[n,l]=s.useState(!0),[g,u]=s.useState(null);s.useEffect(()=>{let t=!0;async function h(){try{const[c,y]=await Promise.all([N.loadGlobalLeaderboard(20,0),N.loadMyRank()]);if(!t)return;i(c),d(y)}catch(c){console.error("Failed to load BOBU leaderboard:",c),t&&u(e("leaderboard.error.load"))}finally{t&&l(!1)}}return h(),()=>{t=!1}},[e]);const p=r.slice(0,3),m=r.slice(3,20);return a.jsxs("section",{className:"bobu-leaderboard-page",children:[a.jsx(E,{}),a.jsx("style",{children:`
        .bobu-leaderboard-page {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          padding:
            clamp(132px, 15vw, 164px)
            clamp(18px, 4vw, 54px)
            90px;
          color: #f8f7ff;
          isolation: isolate;
          background:
            radial-gradient(
              circle at 14% 18%,
              rgba(115, 59, 255, 0.2),
              transparent 28%
            ),
            radial-gradient(
              circle at 88% 22%,
              rgba(255, 111, 38, 0.16),
              transparent 25%
            ),
            radial-gradient(
              circle at 50% 78%,
              rgba(31, 210, 255, 0.12),
              transparent 35%
            ),
            linear-gradient(
              180deg,
              #070514 0%,
              #08091b 48%,
              #040712 100%
            );
        }

        .leaderboard-space-layer {
          position: absolute;
          inset: 0;
          z-index: -5;
          overflow: hidden;
          pointer-events: none;
        }

        .leaderboard-space-layer::before,
        .leaderboard-space-layer::after {
          content: "";
          position: absolute;
          inset: 0;
        }

        .leaderboard-space-layer::before {
          opacity: 0.72;
          background-image:
            radial-gradient(
              circle,
              rgba(255, 255, 255, 0.95) 0 1px,
              transparent 1.6px
            ),
            radial-gradient(
              circle,
              rgba(107, 219, 255, 0.8) 0 1px,
              transparent 1.8px
            ),
            radial-gradient(
              circle,
              rgba(197, 147, 255, 0.75) 0 1px,
              transparent 1.6px
            );
          background-size:
            47px 47px,
            79px 79px,
            113px 113px;
          background-position:
            0 0,
            18px 27px,
            43px 12px;
          animation: leaderboard-stars-drift 75s linear infinite;
        }

        .leaderboard-space-layer::after {
          opacity: 0.3;
          filter: blur(30px);
          background:
            radial-gradient(
              ellipse at 30% 40%,
              rgba(115, 68, 255, 0.38),
              transparent 32%
            ),
            radial-gradient(
              ellipse at 75% 65%,
              rgba(20, 199, 255, 0.26),
              transparent 30%
            );
          animation: leaderboard-nebula 12s ease-in-out infinite;
        }

        .leaderboard-planet {
          position: absolute;
          z-index: -3;
          border-radius: 50%;
          pointer-events: none;
          animation:
            leaderboard-float 8s ease-in-out infinite,
            leaderboard-planet-spin 28s linear infinite;
        }

        .leaderboard-planet-purple {
          top: 150px;
          left: -78px;
          width: clamp(180px, 22vw, 320px);
          aspect-ratio: 1;
          background:
            radial-gradient(
              circle at 32% 28%,
              rgba(236, 218, 255, 0.94),
              rgba(141, 78, 255, 0.78) 18%,
              rgba(66, 24, 142, 0.96) 55%,
              rgba(16, 8, 42, 1) 79%
            );
          box-shadow:
            0 0 70px rgba(123, 74, 255, 0.35),
            inset -28px -34px 48px rgba(5, 3, 18, 0.75),
            inset 20px 16px 36px rgba(255, 255, 255, 0.12);
        }

        .leaderboard-planet-purple::before,
        .leaderboard-planet-purple::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 52%;
          width: 162%;
          height: 35%;
          border-radius: 50%;
          pointer-events: none;
          transform:
            translate(-50%, -50%)
            rotate(-13deg);
          transform-origin: center;
          animation:
            leaderboard-ring-drift
            150s
            linear
            infinite;
        }

        .leaderboard-planet-purple::before {
          z-index: -1;
          opacity: 0.82;
          background:
            repeating-radial-gradient(
              ellipse at center,
              transparent 0 47%,
              rgba(74, 43, 130, 0.08) 47.6% 49%,
              rgba(130, 85, 209, 0.18) 49.4% 51%,
              rgba(218, 189, 255, 0.28) 51.4% 53.5%,
              rgba(95, 58, 167, 0.21) 54% 56.5%,
              rgba(184, 136, 255, 0.16) 57% 59%,
              rgba(53, 29, 101, 0.11) 59.5% 62%,
              transparent 63% 72%
            );
          filter:
            blur(1.35px)
            drop-shadow(
              0 0 12px rgba(145, 100, 255, 0.16)
            );
        }

        .leaderboard-planet-purple::after {
          z-index: 3;
          clip-path: inset(49% 0 0 0);
          opacity: 0.9;
          background:
            repeating-radial-gradient(
              ellipse at center,
              transparent 0 46.5%,
              rgba(255, 246, 255, 0.14) 47% 48.2%,
              rgba(209, 174, 255, 0.38) 49% 51%,
              rgba(134, 86, 219, 0.43) 51.7% 54.5%,
              rgba(233, 210, 255, 0.22) 55.2% 56.4%,
              rgba(83, 49, 148, 0.3) 57% 59.8%,
              rgba(184, 132, 255, 0.18) 60.5% 62.2%,
              transparent 63.5% 72%
            );
          filter:
            blur(0.55px)
            drop-shadow(
              0 4px 5px rgba(12, 5, 31, 0.56)
            )
            drop-shadow(
              0 0 7px rgba(196, 150, 255, 0.19)
            );
        }

        .leaderboard-planet-orange {
          top: 105px;
          right: -58px;
          width: clamp(150px, 18vw, 255px);
          aspect-ratio: 1;
          overflow: hidden;
          animation-delay: -3s;
          background:
            repeating-linear-gradient(
              -8deg,
              transparent 0 9px,
              rgba(255, 239, 190, 0.06) 10px 14px,
              rgba(185, 63, 26, 0.08) 15px 20px
            ),
            radial-gradient(
              ellipse at 48% 18%,
              rgba(255, 244, 202, 0.46),
              transparent 26%
            ),
            radial-gradient(
              circle at 34% 28%,
              #ffe6ad,
              #ffad42 24%,
              #e5642c 52%,
              #8b2b27 72%,
              #351020 91%
            );
          box-shadow:
            0 0 0 1px rgba(255, 185, 91, 0.13),
            0 0 44px rgba(255, 121, 40, 0.25),
            0 0 82px rgba(255, 72, 35, 0.12),
            inset -30px -34px 48px rgba(47, 7, 19, 0.74),
            inset 17px 10px 28px rgba(255, 238, 192, 0.11);
        }

        .leaderboard-planet-orange::before {
          content: "";
          position: absolute;
          inset: -7%;
          border-radius: 50%;
          pointer-events: none;
          background:
            repeating-linear-gradient(
              -10deg,
              transparent 0 18px,
              rgba(255, 241, 204, 0.11) 19px 22px,
              transparent 23px 37px,
              rgba(118, 36, 31, 0.1) 38px 43px
            );
          mix-blend-mode: screen;
          opacity: 0.54;
          animation:
            leaderboard-orange-clouds
            42s
            linear
            infinite;
        }

        .leaderboard-planet-orange::after {
          content: "";
          position: absolute;
          inset: -2px;
          border-radius: 50%;
          pointer-events: none;
          background:
            radial-gradient(
              circle at 30% 24%,
              rgba(255, 255, 230, 0.22),
              transparent 22%
            ),
            linear-gradient(
              92deg,
              rgba(101, 218, 255, 0.13),
              transparent 14% 76%,
              rgba(255, 121, 59, 0.08)
            );
          box-shadow:
            inset 4px 0 9px rgba(102, 226, 255, 0.11),
            inset -6px 0 12px rgba(255, 131, 58, 0.09);
        }

        .leaderboard-planet-ice {
          right: 7%;
          bottom: 5%;
          width: clamp(100px, 12vw, 170px);
          aspect-ratio: 1;
          opacity: 0.75;
          animation-delay: -5s;
          background:
            radial-gradient(
              circle at 32% 28%,
              #e6ffff,
              #71dcff 27%,
              #1d65aa 61%,
              #071c45 85%
            );
          box-shadow:
            0 0 52px rgba(61, 199, 255, 0.27),
            inset -20px -24px 35px rgba(3, 17, 48, 0.75);
        }

        .leaderboard-orbit-ring {
          position: absolute;
          z-index: -4;
          width: min(880px, 86vw);
          aspect-ratio: 1;
          top: 49%;
          left: 50%;
          border: 1px solid rgba(126, 179, 255, 0.1);
          border-radius: 50%;
          transform: translate(-50%, -50%) rotate(-12deg);
          box-shadow:
            0 0 60px rgba(72, 90, 255, 0.04),
            inset 0 0 60px rgba(84, 205, 255, 0.03);
          animation: leaderboard-orbit 40s linear infinite;
        }

        .leaderboard-orbit-ring::before,
        .leaderboard-orbit-ring::after {
          content: "";
          position: absolute;
          border: 1px solid rgba(143, 98, 255, 0.09);
          border-radius: inherit;
        }

        .leaderboard-orbit-ring::before {
          inset: 10%;
        }

        .leaderboard-orbit-ring::after {
          inset: 24%;
        }

        .shooting-star {
          position: absolute;
          top: var(--star-top);
          left: var(--star-left);
          z-index: -1;
          width: var(--star-length);
          height: 2px;
          opacity: var(--star-opacity);
          border-radius: 999px;
          transform: rotate(-26deg);
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(122, 216, 255, 0.15),
              rgba(255, 255, 255, 0.98)
            );
          filter: drop-shadow(
            0 0 7px rgba(110, 218, 255, 0.85)
          );
          animation:
            leaderboard-shooting-star
            var(--star-duration)
            linear
            var(--star-delay)
            infinite;
        }

        .shooting-star::after {
          content: "";
          position: absolute;
          right: -2px;
          top: 50%;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          transform: translateY(-50%);
          background: #ffffff;
          box-shadow:
            0 0 8px #ffffff,
            0 0 15px #69dfff,
            0 0 25px rgba(127, 94, 255, 0.9);
        }

        .cosmic-burst {
          position: absolute;
          top: var(--burst-top);
          left: var(--burst-left);
          z-index: -2;
          width: var(--burst-size);
          height: var(--burst-size);
          border-radius: 50%;
          opacity: 0;
          background:
            repeating-conic-gradient(
              from 0deg,
              rgba(255, 255, 255, 0.95) 0deg 2deg,
              transparent 2deg 20deg
            );
          filter:
            blur(0.3px)
            drop-shadow(0 0 8px rgba(116, 207, 255, 0.9));
          animation:
            leaderboard-cosmic-burst
            9s
            ease-out
            var(--burst-delay)
            infinite;
        }

        .cosmic-burst::before {
          content: "";
          position: absolute;
          inset: 42%;
          border-radius: 50%;
          background: #fff;
          box-shadow:
            0 0 14px #fff,
            0 0 32px #66d9ff,
            0 0 55px #934fff;
        }

        .leaderboard-container {
          position: relative;
          z-index: 2;
          width: min(1180px, 100%);
          margin: 0 auto;
        }

        .leaderboard-hero {
          max-width: 820px;
          margin: 0 auto 42px;
          text-align: center;
        }

        .leaderboard-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 18px;
          padding: 8px 15px;
          border: 1px solid rgba(126, 210, 255, 0.22);
          border-radius: 999px;
          color: #85e9ff;
          font-size: 12px;
          font-weight: 850;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          background: rgba(11, 18, 41, 0.64);
          box-shadow:
            inset 0 1px rgba(255, 255, 255, 0.06),
            0 0 28px rgba(59, 190, 255, 0.08);
          backdrop-filter: blur(16px);
        }

        .leaderboard-title {
          margin: 0;
          font-size: clamp(38px, 6vw, 76px);
          line-height: 0.98;
          font-weight: 950;
          letter-spacing: -0.055em;
          text-transform: uppercase;
          background:
            linear-gradient(
              110deg,
              #ffffff,
              #b7dfff 34%,
              #ba8cff 66%,
              #ffb15c
            );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          filter: drop-shadow(
            0 0 25px rgba(124, 104, 255, 0.2)
          );
        }

        .leaderboard-subtitle {
          max-width: 620px;
          margin: 20px auto 0;
          color: rgba(223, 227, 255, 0.68);
          font-size: clamp(15px, 2vw, 18px);
          line-height: 1.7;
        }

        .leaderboard-main-card {
          position: relative;
          overflow: hidden;
          padding: clamp(20px, 4vw, 38px);
          border: 1px solid rgba(143, 132, 255, 0.18);
          border-radius: 34px;
          background:
            linear-gradient(
              145deg,
              rgba(22, 17, 55, 0.84),
              rgba(7, 16, 37, 0.9)
            );
          box-shadow:
            0 34px 100px rgba(0, 0, 0, 0.42),
            0 0 60px rgba(79, 73, 255, 0.08),
            inset 0 1px rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(24px) saturate(135%);
        }

        .leaderboard-main-card::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(
              circle at 12% 15%,
              rgba(123, 82, 255, 0.14),
              transparent 28%
            ),
            radial-gradient(
              circle at 86% 8%,
              rgba(255, 156, 67, 0.09),
              transparent 25%
            );
        }

        .leaderboard-section-heading {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 28px;
        }

        .leaderboard-section-heading h2 {
          display: flex;
          align-items: center;
          gap: 11px;
          margin: 0;
          font-size: clamp(21px, 3vw, 30px);
          letter-spacing: -0.035em;
        }

        .leaderboard-live-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border: 1px solid rgba(44, 246, 167, 0.18);
          border-radius: 999px;
          color: #66ffc0;
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 0.12em;
          background: rgba(17, 78, 61, 0.18);
        }

        .leaderboard-live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #42ffae;
          box-shadow: 0 0 12px #42ffae;
          animation: leaderboard-live-pulse 1.5s ease-in-out infinite;
        }

        .leaderboard-podium {
          position: relative;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          align-items: end;
          gap: 16px;
          margin-bottom: 24px;
        }

        .leaderboard-podium-card {
          position: relative;
          min-height: 220px;
          overflow: hidden;
          padding: 26px 20px 22px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 25px;
          text-align: center;
          background:
            linear-gradient(
              155deg,
              rgba(255, 255, 255, 0.075),
              rgba(255, 255, 255, 0.018)
            );
          transition:
            transform 220ms ease,
            border-color 220ms ease,
            box-shadow 220ms ease;
        }

        .leaderboard-podium-card:hover {
          transform: translateY(-5px);
        }

        .leaderboard-podium-card.rank-1 {
          order: 2;
          min-height: 260px;
          border-color: rgba(255, 201, 87, 0.36);
          background:
            radial-gradient(
              circle at 50% 10%,
              rgba(255, 210, 100, 0.24),
              transparent 36%
            ),
            linear-gradient(
              155deg,
              rgba(97, 65, 16, 0.48),
              rgba(20, 17, 35, 0.8)
            );
          box-shadow:
            0 0 42px rgba(255, 186, 53, 0.12),
            inset 0 1px rgba(255, 246, 197, 0.12);
        }

        .leaderboard-podium-card.rank-2 {
          order: 1;
          border-color: rgba(193, 222, 255, 0.24);
        }

        .leaderboard-podium-card.rank-3 {
          order: 3;
          border-color: rgba(255, 143, 91, 0.24);
        }

        .leaderboard-podium-rank {
          position: absolute;
          top: 14px;
          right: 15px;
          display: grid;
          width: 38px;
          height: 38px;
          place-items: center;
          border-radius: 50%;
          font-weight: 950;
          color: white;
          background: rgba(255, 255, 255, 0.08);
        }

        .rank-1 .leaderboard-podium-rank {
          color: #ffe081;
          background: rgba(255, 193, 65, 0.14);
          box-shadow: 0 0 18px rgba(255, 193, 65, 0.2);
        }

        .rank-2 .leaderboard-podium-rank {
          color: #dcecff;
        }

        .rank-3 .leaderboard-podium-rank {
          color: #ffad83;
        }

        .leaderboard-avatar {
          display: grid;
          width: 72px;
          height: 72px;
          margin: 18px auto 16px;
          place-items: center;
          border: 2px solid rgba(139, 214, 255, 0.38);
          border-radius: 50%;
          color: white;
          font-size: 20px;
          font-weight: 950;
          background:
            radial-gradient(
              circle at 35% 25%,
              rgba(192, 155, 255, 0.92),
              rgba(81, 52, 190, 0.9) 42%,
              rgba(12, 21, 55, 1) 76%
            );
          box-shadow:
            0 0 0 5px rgba(113, 77, 255, 0.08),
            0 0 28px rgba(96, 148, 255, 0.25);
        }

        .rank-1 .leaderboard-avatar {
          width: 86px;
          height: 86px;
          border-color: rgba(255, 218, 114, 0.64);
          background:
            radial-gradient(
              circle at 35% 25%,
              #fff5c7,
              #ffbd48 34%,
              #984416 70%,
              #301120 92%
            );
          box-shadow:
            0 0 0 6px rgba(255, 197, 79, 0.1),
            0 0 38px rgba(255, 184, 55, 0.32);
        }

        .leaderboard-builder-name {
          margin: 0;
          overflow: hidden;
          font-size: 17px;
          font-weight: 850;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .leaderboard-builder-level {
          margin-top: 7px;
          color: rgba(220, 224, 255, 0.58);
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .leaderboard-builder-gp {
          margin-top: 17px;
          color: #75eaff;
          font-size: 17px;
          font-weight: 950;
          letter-spacing: -0.02em;
        }

        .rank-1 .leaderboard-builder-gp {
          color: #ffd773;
          font-size: 20px;
        }

        .leaderboard-list {
          position: relative;
          display: grid;
          gap: 9px;
        }

        .leaderboard-row {
          display: grid;
          grid-template-columns:
            62px
            minmax(150px, 1fr)
            100px
            140px;
          align-items: center;
          gap: 14px;
          min-height: 68px;
          padding: 10px 18px;
          border: 1px solid rgba(255, 255, 255, 0.065);
          border-radius: 18px;
          background:
            linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.038),
              rgba(255, 255, 255, 0.016)
            );
          transition:
            transform 200ms ease,
            border-color 200ms ease,
            background 200ms ease,
            box-shadow 200ms ease;
        }

        .leaderboard-row:hover {
          transform: translateX(5px);
          border-color: rgba(112, 211, 255, 0.2);
          background:
            linear-gradient(
              90deg,
              rgba(107, 76, 255, 0.11),
              rgba(49, 207, 255, 0.05)
            );
          box-shadow: 0 0 28px rgba(78, 151, 255, 0.06);
        }

        .leaderboard-row-rank {
          color: #aea7ff;
          font-weight: 950;
        }

        .leaderboard-row-builder {
          display: flex;
          align-items: center;
          min-width: 0;
          gap: 12px;
        }

        .leaderboard-row-avatar {
          display: grid;
          flex: 0 0 40px;
          width: 40px;
          height: 40px;
          place-items: center;
          border: 1px solid rgba(147, 187, 255, 0.2);
          border-radius: 50%;
          color: #f6f3ff;
          font-size: 12px;
          font-weight: 900;
          background:
            linear-gradient(
              145deg,
              rgba(132, 83, 255, 0.5),
              rgba(32, 92, 143, 0.45)
            );
        }

        .leaderboard-row-name {
          overflow: hidden;
          color: #f5f4ff;
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .leaderboard-row-level {
          color: rgba(217, 221, 255, 0.65);
          font-size: 13px;
        }

        .leaderboard-row-gp {
          color: #69e8ff;
          font-weight: 900;
          text-align: right;
        }

        .leaderboard-my-rank {
          position: relative;
          display: grid;
          grid-template-columns:
            minmax(180px, 1.4fr)
            repeat(3, minmax(100px, 0.65fr));
          align-items: center;
          gap: 16px;
          margin-top: 22px;
          padding: 22px 24px;
          overflow: hidden;
          border: 1px solid rgba(110, 222, 255, 0.3);
          border-radius: 24px;
          background:
            radial-gradient(
              circle at 0% 50%,
              rgba(95, 71, 255, 0.24),
              transparent 35%
            ),
            linear-gradient(
              100deg,
              rgba(29, 24, 80, 0.9),
              rgba(7, 35, 58, 0.86)
            );
          box-shadow:
            0 0 36px rgba(73, 176, 255, 0.1),
            inset 0 1px rgba(255, 255, 255, 0.08);
        }

        .leaderboard-my-rank::after {
          content: "";
          position: absolute;
          top: -80%;
          left: -40%;
          width: 55%;
          height: 250%;
          transform: rotate(24deg);
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.07),
              transparent
            );
          animation: leaderboard-card-shine 6s ease-in-out infinite;
        }

        .leaderboard-my-rank-title {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .leaderboard-my-rank-icon {
          display: grid;
          flex: 0 0 50px;
          width: 50px;
          height: 50px;
          place-items: center;
          border: 1px solid rgba(111, 225, 255, 0.3);
          border-radius: 16px;
          color: #7deaff;
          background: rgba(56, 184, 255, 0.08);
          box-shadow: 0 0 22px rgba(60, 204, 255, 0.1);
        }

        .leaderboard-my-rank-copy strong {
          display: block;
          color: white;
          font-size: 16px;
        }

        .leaderboard-my-rank-copy span {
          display: block;
          margin-top: 5px;
          overflow: hidden;
          color: rgba(217, 224, 255, 0.58);
          font-size: 13px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .leaderboard-rank-stat {
          position: relative;
          z-index: 2;
        }

        .leaderboard-rank-stat span {
          display: block;
          margin-bottom: 6px;
          color: rgba(199, 208, 243, 0.52);
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .leaderboard-rank-stat strong {
          color: white;
          font-size: clamp(18px, 3vw, 25px);
          letter-spacing: -0.04em;
        }

        .leaderboard-rank-stat:last-child strong {
          color: #76eaff;
        }

        .leaderboard-state {
          position: relative;
          display: grid;
          min-height: 420px;
          place-items: center;
          text-align: center;
        }

        .leaderboard-state-content {
          max-width: 420px;
        }

        .leaderboard-loader {
          width: 64px;
          height: 64px;
          margin: 0 auto 22px;
          border: 2px solid rgba(112, 200, 255, 0.12);
          border-top-color: #73e8ff;
          border-radius: 50%;
          box-shadow: 0 0 25px rgba(79, 212, 255, 0.12);
          animation: leaderboard-spin 0.9s linear infinite;
        }

        .leaderboard-empty-copy {
          color: rgba(217, 222, 255, 0.66);
          line-height: 1.7;
        }

        @keyframes leaderboard-shooting-star {
          0% {
            opacity: 0;
            transform:
              translate3d(-180px, -90px, 0)
              rotate(-26deg)
              scaleX(0.3);
          }
          9% {
            opacity: var(--star-opacity);
          }
          65% {
            opacity: var(--star-opacity);
          }
          100% {
            opacity: 0;
            transform:
              translate3d(520px, 260px, 0)
              rotate(-26deg)
              scaleX(1);
          }
        }

        @keyframes leaderboard-cosmic-burst {
          0%, 72% {
            opacity: 0;
            transform: scale(0.08) rotate(0deg);
          }
          74% {
            opacity: 1;
          }
          82% {
            opacity: 0.82;
            transform: scale(1) rotate(12deg);
          }
          91%, 100% {
            opacity: 0;
            transform: scale(1.55) rotate(20deg);
          }
        }

        @keyframes leaderboard-ring-drift {
          from {
            transform:
              translate(-50%, -50%)
              rotate(-13deg);
          }

          to {
            transform:
              translate(-50%, -50%)
              rotate(347deg);
          }
        }

        @keyframes leaderboard-orange-clouds {
          from {
            transform:
              translate3d(-2%, 0, 0)
              rotate(0deg);
          }

          to {
            transform:
              translate3d(4%, 0, 0)
              rotate(360deg);
          }
        }

        @keyframes leaderboard-nebula {
          0%, 100% {
            transform: scale(1) translate3d(0, 0, 0);
          }
          50% {
            transform: scale(1.08) translate3d(2%, -1%, 0);
          }
        }

        @keyframes leaderboard-stars-drift {
          to {
            background-position:
              180px 320px,
              -120px 220px,
              250px -160px;
          }
        }

        @keyframes leaderboard-float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-16px);
          }
        }

        @keyframes leaderboard-planet-spin {
          to {
            filter: hue-rotate(12deg);
          }
        }

        @keyframes leaderboard-orbit {
          to {
            transform:
              translate(-50%, -50%)
              rotate(348deg);
          }
        }

        @keyframes leaderboard-live-pulse {
          0%, 100% {
            opacity: 0.55;
            transform: scale(0.85);
          }
          50% {
            opacity: 1;
            transform: scale(1.18);
          }
        }

        @keyframes leaderboard-card-shine {
          0%, 35% {
            transform:
              translateX(-120%)
              rotate(24deg);
          }
          70%, 100% {
            transform:
              translateX(350%)
              rotate(24deg);
          }
        }

        @keyframes leaderboard-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 820px) {
          .leaderboard-podium {
            grid-template-columns: 1fr;
          }

          .leaderboard-podium-card.rank-1,
          .leaderboard-podium-card.rank-2,
          .leaderboard-podium-card.rank-3 {
            order: initial;
            min-height: 210px;
          }

          .leaderboard-row {
            grid-template-columns:
              48px
              minmax(120px, 1fr)
              105px;
          }

          .leaderboard-row-level {
            display: none;
          }

          .leaderboard-my-rank {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }

          .leaderboard-my-rank-title {
            grid-column: 1 / -1;
          }

          .leaderboard-planet-purple {
            left: -135px;
          }

          .leaderboard-planet-orange {
            right: -115px;
          }
        }

        @media (max-width: 520px) {
          .bobu-leaderboard-page {
            padding-inline: 12px;
          }

          .leaderboard-main-card {
            padding: 16px 12px;
            border-radius: 24px;
          }

          .leaderboard-section-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .leaderboard-row {
            grid-template-columns:
              38px
              minmax(100px, 1fr)
              92px;
            gap: 8px;
            padding: 9px 10px;
          }

          .leaderboard-row-avatar {
            display: none;
          }

          .leaderboard-row-gp {
            font-size: 13px;
          }

          .leaderboard-my-rank {
            padding: 18px 15px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .shooting-star,
          .cosmic-burst,
          .leaderboard-planet,
          .leaderboard-orbit-ring,
          .leaderboard-space-layer::before,
          .leaderboard-space-layer::after,
          .leaderboard-my-rank::after,
          .leaderboard-live-dot {
            animation: none !important;
          }

          .shooting-star {
            display: none;
          }
        }
      `}),a.jsxs("div",{className:"leaderboard-space-layer","aria-hidden":"true",children:[F.map(t=>a.jsx("span",{className:"shooting-star",style:{"--star-top":t.top,"--star-left":t.left,"--star-delay":t.delay,"--star-duration":t.duration,"--star-length":t.length,"--star-opacity":t.opacity}},t.id)),X.map(t=>a.jsx("span",{className:"cosmic-burst",style:{"--burst-top":t.top,"--burst-left":t.left,"--burst-delay":t.delay,"--burst-size":t.size}},t.id))]}),a.jsx("div",{className:"leaderboard-planet leaderboard-planet-purple","aria-hidden":"true"}),a.jsx("div",{className:"leaderboard-planet leaderboard-planet-orange","aria-hidden":"true"}),a.jsx("div",{className:"leaderboard-planet leaderboard-planet-ice","aria-hidden":"true"}),a.jsx("div",{className:"leaderboard-orbit-ring","aria-hidden":"true"}),a.jsxs("div",{className:"leaderboard-container",children:[a.jsxs("header",{className:"leaderboard-hero",children:[a.jsxs("div",{className:"leaderboard-eyebrow",children:[a.jsx(A,{size:15}),e("leaderboard.hero.eyebrow")]}),a.jsxs("h1",{className:"leaderboard-title",children:[e("leaderboard.hero.titleLine1"),a.jsx("br",{}),e("leaderboard.hero.titleLine2")]}),a.jsx("p",{className:"leaderboard-subtitle",children:e("leaderboard.hero.subtitle")})]}),!n&&!g&&a.jsx(G,{entries:r}),a.jsx("div",{className:"leaderboard-main-card",children:n?a.jsx("div",{className:"leaderboard-state",children:a.jsxs("div",{className:"leaderboard-state-content",children:[a.jsx("div",{className:"leaderboard-loader"}),a.jsx("h2",{children:e("leaderboard.loading.title")}),a.jsx("p",{className:"leaderboard-empty-copy",children:e("leaderboard.loading.description")})]})}):g?a.jsx("div",{className:"leaderboard-state",children:a.jsxs("div",{className:"leaderboard-state-content",children:[a.jsx(L,{size:46}),a.jsx("h2",{children:e("leaderboard.error.title")}),a.jsx("p",{className:"leaderboard-empty-copy",children:g})]})}):a.jsxs(a.Fragment,{children:[a.jsxs("div",{className:"leaderboard-section-heading",children:[a.jsxs("h2",{children:[a.jsx(M,{size:27}),e("leaderboard.section.topBuilders")]}),a.jsxs("div",{className:"leaderboard-live-badge",children:[a.jsx("span",{className:"leaderboard-live-dot"}),e("leaderboard.section.liveRanking")]})]}),p.length>0?a.jsxs(a.Fragment,{children:[a.jsx("div",{className:"leaderboard-podium",children:p.map(t=>a.jsxs("article",{className:`leaderboard-podium-card rank-${t.rank}`,children:[a.jsx("div",{className:"leaderboard-podium-rank",children:P(t.rank)}),a.jsx("div",{className:"leaderboard-avatar",children:z(t)}),a.jsx("h3",{className:"leaderboard-builder-name",children:f(t)}),a.jsx("div",{className:"leaderboard-builder-level",children:e("leaderboard.entry.level",{level:t.level})}),a.jsxs("div",{className:"leaderboard-builder-gp",children:[a.jsx(b,{value:t.gp})," GP"]})]},t.builderId))}),a.jsx("div",{className:"leaderboard-list",children:m.map(t=>a.jsxs("article",{className:"leaderboard-row",children:[a.jsxs("div",{className:"leaderboard-row-rank",children:["#",t.rank]}),a.jsxs("div",{className:"leaderboard-row-builder",children:[a.jsx("div",{className:"leaderboard-row-avatar",children:z(t)}),a.jsx("div",{className:"leaderboard-row-name",children:f(t)})]}),a.jsx("div",{className:"leaderboard-row-level",children:e("leaderboard.entry.level",{level:t.level})}),a.jsxs("div",{className:"leaderboard-row-gp",children:[a.jsx(b,{value:t.gp})," GP"]})]},t.builderId))})]}):a.jsx("div",{className:"leaderboard-state",children:a.jsxs("div",{className:"leaderboard-state-content",children:[a.jsx($,{size:48}),a.jsx("h2",{children:e("leaderboard.empty.title")}),a.jsx("p",{className:"leaderboard-empty-copy",children:e("leaderboard.empty.description")})]})}),o&&a.jsxs("aside",{className:"leaderboard-my-rank",children:[a.jsxs("div",{className:"leaderboard-my-rank-title",children:[a.jsx("div",{className:"leaderboard-my-rank-icon",children:a.jsx(S,{size:24})}),a.jsxs("div",{className:"leaderboard-my-rank-copy",children:[a.jsx("strong",{children:e("leaderboard.myRank.title")}),a.jsx("span",{children:f(o)})]})]}),a.jsxs("div",{className:"leaderboard-rank-stat",children:[a.jsx("span",{children:e("leaderboard.myRank.rank")}),a.jsxs("strong",{children:["#",o.rank]})]}),a.jsxs("div",{className:"leaderboard-rank-stat",children:[a.jsx("span",{children:e("leaderboard.myRank.level")}),a.jsx("strong",{children:o.level})]}),a.jsxs("div",{className:"leaderboard-rank-stat",children:[a.jsx("span",{children:e("leaderboard.myRank.builderGp")}),a.jsx("strong",{children:a.jsx(b,{value:o.gp})})]})]})]})})]})]})}export{q as default};
