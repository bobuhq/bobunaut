import{r as p,j as e}from"./vendor-react-Db_inLa4.js";import{b as N,m as b,g as Y,r as q,a as Z,u as H}from"./index-BRO6E1Mc.js";import{t as J,S as O,j as Q,i as F,s as U,y as v,o as R,z as X,Z as W,G as ee,x as L,v as z,L as A,D as E,w as P,l as ie,F as G,H as se,I as ae,J as te,E as ne,K as re,R as ce,T as oe}from"./vendor-icons-JbKY7JUy.js";import{m as K}from"./vendor-motion-DZA6fOcq.js";import"./vendor-C2bh2AFn.js";import"./vendor-supabase-BRUXfWZX.js";function me(){const a=p.useSyncExternalStore(N.subscribe,N.getSnapshot,N.getSnapshot);p.useSyncExternalStore(t=>b.subscribe(t),()=>b.getVersion(),()=>b.getVersion());const i=!!a.id&&a.id!=="builder-001";return{builderId:i?a.id:"",definitions:b.getDefinitions(),progress:i?b.getBuilderProgress(a.id):[]}}const T={"start-mining":{categoryKey:"missions.presentation.category.daily",difficultyKey:"missions.presentation.difficulty.easy",durationKey:"missions.presentation.duration.oneMinute",actionKey:"missions.presentation.action.startMining",icon:F},"join-community":{categoryKey:"missions.presentation.category.community",difficultyKey:"missions.presentation.difficulty.easy",durationKey:"missions.presentation.duration.threeMinutes",actionKey:"missions.presentation.action.openChannels",icon:Q},"create-meme":{categoryKey:"missions.presentation.category.creator",difficultyKey:"missions.presentation.difficulty.medium",durationKey:"missions.presentation.duration.tenMinutes",actionKey:"missions.presentation.action.startCreating",icon:O},"arcade-coming-soon":{categoryKey:"missions.presentation.category.arcade",difficultyKey:"missions.presentation.difficulty.unknown",durationKey:"missions.presentation.duration.comingSoon",icon:J}},le={categoryKey:"missions.presentation.category.mission",difficultyKey:"missions.presentation.difficulty.unknown",durationKey:"missions.presentation.duration.unknown",actionKey:"missions.presentation.action.viewMission",icon:T["start-mining"].icon};function B(a){switch(a){case"claimed":return"claimed";case"completed":return"completed";case"locked":case"expired":return"locked";case"available":case"active":default:return"available"}}function de(a,i,t){const r=T[a.id]??le,n=(i==null?void 0:i.status)??"available",o=(i==null?void 0:i.progress)??0,w=a.target<=0?0:Math.min(100,Math.round(o/a.target*100)),g=a.reward.gp??0,x=g>0?`${g.toLocaleString(t.language)} GP`:t.t("missions.presentation.noGp"),h=a.id==="start-mining"?"missions.catalog.startMining.title":null,l=a.id==="start-mining"?"missions.catalog.startMining.description":null;return{id:a.id,cycleKey:(i==null?void 0:i.cycleKey)??"default",category:t.t(r.categoryKey),title:h?t.t(h):a.title,description:l?t.t(l):a.description,rewardGp:g,reward:x,rewardLabel:x,difficulty:t.t(r.difficultyKey),duration:t.t(r.durationKey),action:r.actionKey?t.t(r.actionKey):void 0,icon:r.icon,cadence:a.cadence,target:a.target,progress:o,progressPercent:w,status:B(n),rawStatus:n,displayStatus:B(n),completedAt:i==null?void 0:i.completedAt,claimedAt:i==null?void 0:i.claimedAt}}function pe(a,i,t){const r=new Map(i.map(n=>[n.missionId,n]));return a.map(n=>de(n,r.get(n.id),t))}class ge{async claim(i,t,r){const n=await Y.claimMissionReward(t,r);return await Promise.all([q(i),Z.restore(i)]),n}}const xe=new ge,he=[{titleKey:"missions.page.rewards.giftCards.title",descriptionKey:"missions.page.rewards.giftCards.description",icon:v},{titleKey:"missions.page.rewards.airdrops.title",descriptionKey:"missions.page.rewards.airdrops.description",icon:ce},{titleKey:"missions.page.rewards.badges.title",descriptionKey:"missions.page.rewards.badges.description",icon:L},{titleKey:"missions.page.rewards.leaderboard.title",descriptionKey:"missions.page.rewards.leaderboard.description",icon:oe}],ue=[{name:"X",handle:"@bobu_hq",href:"https://x.com/bobu_hq",icon:ae},{name:"Instagram",handle:"@bobu_solana_coin",href:"https://instagram.com/bobu_solana_coin",icon:te},{name:"Telegram",handleKey:"missions.page.social.officialCommunity",href:"https://t.me/+I0Q01kVMYw41YjA0",icon:ne}],be=[{titleKey:"missions.page.activity.controlAccess.title",descriptionKey:"missions.page.activity.controlAccess.description",completed:!0},{titleKey:"missions.page.activity.signalDetected.title",descriptionKey:"missions.page.activity.signalDetected.description",completed:!0},{titleKey:"missions.page.activity.firstMission.title",descriptionKey:"missions.page.activity.firstMission.description",completed:!1},{titleKey:"missions.page.activity.firstBadge.title",descriptionKey:"missions.page.activity.firstBadge.description",completed:!1}];function Ne(){const{language:a,t:i}=H(),{builderId:t,definitions:r,progress:n}=me(),o=p.useMemo(()=>pe(r,n,{language:a,t:i}),[r,n,a,i]),[w,g]=p.useState(!1),[x,h]=p.useState(null),[l,M]=p.useState(null),y=o.filter(s=>s.status==="completed"||s.status==="claimed").length,f=o.filter(s=>s.status!=="locked").length,V=p.useMemo(()=>o.filter(s=>s.status==="completed"||s.status==="claimed").reduce((s,c)=>s+c.rewardGp,0),[o]),C=f===0?0:Math.round(y/f*100);async function _(s,c){if(!(!t||x!==null)){M(null),h(s);try{await xe.claim(t,s,c)}catch(d){const u=d instanceof Error?d.message:i("missions.page.claimError");M({missionId:s,message:u})}finally{h(null)}}}function $(s){if(s==="start-mining"){window.location.assign("/mining");return}s==="join-community"&&g(c=>!c)}return e.jsxs(K.main,{className:"mission-control",initial:{opacity:0,y:18},animate:{opacity:1,y:0},transition:{duration:.55,ease:"easeOut"},children:[e.jsx("style",{children:`
        .mission-control {
          --mc-bg: #08030f;
          --mc-panel: rgba(24, 12, 38, 0.78);
          --mc-panel-strong: rgba(31, 14, 49, 0.94);
          --mc-border: rgba(187, 113, 255, 0.22);
          --mc-purple: #a855f7;
          --mc-purple-light: #d8b4fe;
          --mc-cyan: #22d3ee;
          --mc-gold: #f5cf65;
          --mc-green: #4ade80;
          --mc-red: #fb7185;
          --mc-text: #faf7ff;
          --mc-muted: #b9abc9;

          position: relative;
          overflow: hidden;
          min-height: 100vh;
          padding: 46px 0 96px;
          color: var(--mc-text);
        }

        .mission-control::before,
        .mission-control::after {
          content: "";
          position: absolute;
          pointer-events: none;
          border-radius: 999px;
          filter: blur(90px);
          opacity: 0.28;
        }

        .mission-control::before {
          width: 380px;
          height: 380px;
          top: 80px;
          right: -140px;
          background: #7c3aed;
        }

        .mission-control::after {
          width: 320px;
          height: 320px;
          bottom: 80px;
          left: -160px;
          background: #0891b2;
        }

        .mc-shell {
          position: relative;
          z-index: 1;
          width: min(1180px, calc(100% - 32px));
          margin: 0 auto;
        }

        .mc-kicker {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 8px 13px;
          margin-bottom: 20px;
          border: 1px solid rgba(168, 85, 247, 0.36);
          border-radius: 999px;
          background: rgba(168, 85, 247, 0.08);
          color: var(--mc-purple-light);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.15em;
        }

        .mc-hero {
          display: grid;
          grid-template-columns: minmax(0, 1.3fr) minmax(280px, 0.7fr);
          gap: 28px;
          align-items: stretch;
          margin-bottom: 28px;
        }

        .mc-hero-copy,
        .mc-commander-card,
        .mc-panel,
        .mc-mission-card,
        .mc-stat-card,
        .mc-reward-card {
          border: 1px solid var(--mc-border);
          background:
            linear-gradient(
              145deg,
              rgba(32, 15, 49, 0.9),
              rgba(12, 7, 22, 0.78)
            );
          box-shadow:
            0 24px 70px rgba(0, 0, 0, 0.28),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(18px);
        }

        .mc-hero-copy {
          position: relative;
          overflow: hidden;
          min-height: 330px;
          padding: clamp(30px, 5vw, 62px);
          border-radius: 30px;
        }

        .mc-hero-copy::after {
          content: "";
          position: absolute;
          width: 280px;
          height: 280px;
          top: -120px;
          right: -90px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(34, 211, 238, 0.24),
            transparent 68%
          );
        }

        .mc-hero-copy h1 {
          max-width: 760px;
          margin: 0 0 20px;
          font-size: clamp(44px, 8vw, 86px);
          line-height: 0.92;
          letter-spacing: -0.055em;
        }

        .mc-gradient-text {
          background: linear-gradient(
            100deg,
            #ffffff 0%,
            #d8b4fe 46%,
            #67e8f9 100%
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .mc-hero-copy p {
          max-width: 680px;
          margin: 0;
          color: var(--mc-muted);
          font-size: clamp(16px, 2vw, 19px);
          line-height: 1.75;
        }

        .mc-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 30px;
        }

        .mc-primary-button,
        .mc-secondary-button,
        .mc-mission-button,
        .mc-channel-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-height: 46px;
          border-radius: 14px;
          border: 0;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            background 180ms ease,
            box-shadow 180ms ease;
        }

        .mc-primary-button {
          padding: 0 20px;
          color: #0c0612;
          background: linear-gradient(120deg, #c084fc, #67e8f9);
          box-shadow: 0 14px 34px rgba(168, 85, 247, 0.2);
        }

        .mc-secondary-button {
          padding: 0 20px;
          border: 1px solid var(--mc-border);
          color: var(--mc-text);
          background: rgba(255, 255, 255, 0.035);
        }

        .mc-primary-button:hover,
        .mc-secondary-button:hover,
        .mc-mission-button:hover,
        .mc-channel-link:hover {
          transform: translateY(-2px);
        }

        .mc-commander-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 330px;
          padding: 28px;
          border-radius: 30px;
        }

        .mc-status-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .mc-online {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: var(--mc-green);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .mc-online-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: currentColor;
          box-shadow: 0 0 16px currentColor;
        }

        .mc-rank-icon {
          display: grid;
          width: 62px;
          height: 62px;
          place-items: center;
          margin: 26px 0 18px;
          border: 1px solid rgba(245, 207, 101, 0.28);
          border-radius: 20px;
          color: var(--mc-gold);
          background: rgba(245, 207, 101, 0.08);
        }

        .mc-commander-card h2 {
          margin: 0;
          font-size: 28px;
        }

        .mc-commander-card p {
          margin: 10px 0 0;
          color: var(--mc-muted);
          line-height: 1.65;
        }

        .mc-progress-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 24px 0 9px;
          color: var(--mc-muted);
          font-size: 12px;
          font-weight: 700;
        }

        .mc-progress-track {
          overflow: hidden;
          height: 9px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.07);
        }

        .mc-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #a855f7, #22d3ee);
          box-shadow: 0 0 22px rgba(34, 211, 238, 0.35);
          transition: width 300ms ease;
        }

        .mc-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 28px;
        }

        .mc-stat-card {
          display: flex;
          align-items: center;
          gap: 15px;
          min-height: 112px;
          padding: 20px;
          border-radius: 22px;
        }

        .mc-stat-icon {
          display: grid;
          flex: 0 0 auto;
          width: 46px;
          height: 46px;
          place-items: center;
          border-radius: 15px;
          color: var(--mc-purple-light);
          background: rgba(168, 85, 247, 0.1);
        }

        .mc-stat-card:nth-child(2) .mc-stat-icon {
          color: var(--mc-cyan);
          background: rgba(34, 211, 238, 0.09);
        }

        .mc-stat-card:nth-child(3) .mc-stat-icon {
          color: var(--mc-gold);
          background: rgba(245, 207, 101, 0.09);
        }

        .mc-stat-card:nth-child(4) .mc-stat-icon {
          color: var(--mc-green);
          background: rgba(74, 222, 128, 0.09);
        }

        .mc-stat-card span {
          display: block;
          margin-bottom: 3px;
          color: var(--mc-muted);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .mc-stat-card strong {
          font-size: 24px;
        }

        .mc-section {
          margin-top: 34px;
        }

        .mc-section-heading {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 17px;
        }

        .mc-section-heading h2 {
          margin: 0;
          font-size: clamp(26px, 4vw, 38px);
          letter-spacing: -0.035em;
        }

        .mc-section-heading p {
          max-width: 560px;
          margin: 8px 0 0;
          color: var(--mc-muted);
          line-height: 1.6;
        }

        .mc-section-count {
          flex: 0 0 auto;
          color: var(--mc-purple-light);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .mc-mission-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .mc-mission-card {
          position: relative;
          overflow: hidden;
          padding: 24px;
          border-radius: 24px;
          transition:
            transform 180ms ease,
            border-color 180ms ease;
        }

        .mc-mission-card:hover {
          transform: translateY(-3px);
          border-color: rgba(196, 135, 255, 0.42);
        }

        .mc-mission-card.is-completed {
          border-color: rgba(74, 222, 128, 0.3);
        }

        .mc-mission-card.is-locked {
          opacity: 0.66;
        }

        .mc-mission-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
        }

        .mc-mission-icon {
          display: grid;
          width: 48px;
          height: 48px;
          place-items: center;
          border-radius: 16px;
          color: var(--mc-cyan);
          background: rgba(34, 211, 238, 0.09);
        }

        .mc-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.1em;
        }

        .mc-status-badge.available {
          color: var(--mc-cyan);
          background: rgba(34, 211, 238, 0.09);
        }

        .mc-status-badge.completed {
          color: var(--mc-green);
          background: rgba(74, 222, 128, 0.09);
        }

        .mc-status-badge.locked {
          color: var(--mc-muted);
          background: rgba(255, 255, 255, 0.05);
        }

        .mc-mission-code {
          display: block;
          margin-top: 22px;
          color: var(--mc-purple-light);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.13em;
        }

        .mc-mission-card h3 {
          margin: 9px 0 9px;
          font-size: 23px;
          line-height: 1.18;
        }

        .mc-mission-card > p {
          min-height: 52px;
          margin: 0;
          color: var(--mc-muted);
          line-height: 1.65;
        }

        .mc-mission-meta {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 9px;
          margin: 22px 0;
        }

        .mc-meta-item {
          padding: 11px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.025);
        }

        .mc-meta-item span {
          display: block;
          margin-bottom: 4px;
          color: var(--mc-muted);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.09em;
        }

        .mc-meta-item strong {
          font-size: 12px;
        }

        .mc-mission-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }

        .mc-reward {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--mc-gold);
          font-size: 13px;
          font-weight: 800;
        }

        .mc-mission-button {
          min-width: 148px;
          padding: 0 15px;
          color: #0d0615;
          background: linear-gradient(120deg, #c084fc, #67e8f9);
        }

        .mc-mission-button.completed {
          color: var(--mc-green);
          border: 1px solid rgba(74, 222, 128, 0.26);
          background: rgba(74, 222, 128, 0.08);
        }

.mc-mission-button.claimed {
          color: var(--mc-cyan);
          border: 1px solid rgba(34,211,238,.28);
          background: rgba(34,211,238,.08);
          cursor: default;
        }

        .mc-mission-button.locked {
          cursor: not-allowed;
          color: var(--mc-muted);
          background: rgba(255, 255, 255, 0.05);
        }

        .mc-mission-button:disabled {
          transform: none;
        }

        .mc-claim-error {
          margin: 12px 0 0;
          color: var(--mc-red);
          font-size: 12px;
          line-height: 1.5;
        }

        .mc-channels {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 16px;
          padding: 18px;
          border: 1px solid rgba(34, 211, 238, 0.17);
          border-radius: 20px;
          background: rgba(34, 211, 238, 0.035);
        }

        .mc-channel-link {
          min-height: 66px;
          padding: 12px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          color: var(--mc-text);
          text-decoration: none;
          background: rgba(255, 255, 255, 0.03);
        }

        .mc-channel-copy {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .mc-channel-copy strong {
          font-size: 13px;
        }

        .mc-channel-copy span {
          color: var(--mc-muted);
          font-size: 11px;
        }

        .mc-channel-complete {
          grid-column: 1 / -1;
          justify-self: center;
          margin-top: 4px;
        }

        .mc-two-column {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(300px, 0.9fr);
          gap: 16px;
        }

        .mc-panel {
          padding: 24px;
          border-radius: 24px;
        }

        .mc-panel-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 20px;
        }

        .mc-panel-title h3 {
          margin: 0;
          font-size: 21px;
        }

        .mc-panel-title svg {
          color: var(--mc-purple-light);
        }

        .mc-activity-list {
          display: grid;
          gap: 12px;
        }

        .mc-activity-item {
          display: flex;
          align-items: flex-start;
          gap: 13px;
          padding: 14px;
          border: 1px solid rgba(255, 255, 255, 0.055);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.025);
        }

        .mc-activity-marker {
          display: grid;
          flex: 0 0 auto;
          width: 29px;
          height: 29px;
          place-items: center;
          border-radius: 10px;
          color: var(--mc-muted);
          background: rgba(255, 255, 255, 0.04);
        }

        .mc-activity-marker.done {
          color: var(--mc-green);
          background: rgba(74, 222, 128, 0.08);
        }

        .mc-activity-item strong {
          display: block;
          margin-bottom: 3px;
          font-size: 14px;
        }

        .mc-activity-item p {
          margin: 0;
          color: var(--mc-muted);
          font-size: 12px;
          line-height: 1.55;
        }

        .mc-reward-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .mc-reward-card {
          min-height: 152px;
          padding: 18px;
          border-radius: 19px;
        }

        .mc-reward-card svg {
          color: var(--mc-gold);
        }

        .mc-reward-card h4 {
          margin: 15px 0 7px;
          font-size: 16px;
        }

        .mc-reward-card p {
          margin: 0;
          color: var(--mc-muted);
          font-size: 12px;
          line-height: 1.55;
        }

        .mc-disclaimer {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-top: 18px;
          padding: 15px;
          border: 1px solid rgba(245, 207, 101, 0.17);
          border-radius: 16px;
          color: #d8cba4;
          background: rgba(245, 207, 101, 0.035);
          font-size: 12px;
          line-height: 1.6;
        }

        .mc-disclaimer svg {
          flex: 0 0 auto;
          color: var(--mc-gold);
        }

        .mc-final-message {
          margin-top: 34px;
          padding: 38px 24px;
          border: 1px solid rgba(168, 85, 247, 0.24);
          border-radius: 28px;
          text-align: center;
          background:
            radial-gradient(
              circle at 50% 120%,
              rgba(168, 85, 247, 0.19),
              transparent 56%
            ),
            rgba(19, 9, 30, 0.76);
        }

        .mc-final-message span {
          color: var(--mc-cyan);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.2em;
        }

        .mc-final-message h2 {
          margin: 13px 0 8px;
          font-size: clamp(30px, 5vw, 52px);
        }

        .mc-final-message p {
          margin: 0;
          color: var(--mc-muted);
        }

        @media (max-width: 960px) {
          .mc-hero,
          .mc-two-column {
            grid-template-columns: 1fr;
          }

          .mc-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .mission-control {
            padding-top: 24px;
          }

          .mc-shell {
            width: min(100% - 20px, 1180px);
          }

          .mc-hero-copy,
          .mc-commander-card {
            min-height: auto;
            border-radius: 23px;
          }

          .mc-hero-copy {
            padding: 30px 22px;
          }

          .mc-mission-grid,
          .mc-channels,
          .mc-reward-grid {
            grid-template-columns: 1fr;
          }

          .mc-mission-meta {
            grid-template-columns: 1fr;
          }

          .mc-mission-footer {
            align-items: stretch;
            flex-direction: column;
          }

          .mc-mission-button {
            width: 100%;
          }

          .mc-channel-complete {
            grid-column: auto;
          }

          .mc-section-heading {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 500px) {
          .mc-stats {
            grid-template-columns: 1fr;
          }

          .mc-hero-actions {
            flex-direction: column;
          }

          .mc-primary-button,
          .mc-secondary-button {
            width: 100%;
          }

          .mc-mission-card,
          .mc-panel {
            padding: 19px;
          }
        }
      `}),e.jsxs("div",{className:"mc-shell",children:[e.jsxs("section",{className:"mc-hero",children:[e.jsxs("div",{className:"mc-hero-copy",children:[e.jsxs("div",{className:"mc-kicker",children:[e.jsx(F,{size:15}),i("missions.page.hero.kicker")]}),e.jsx("h1",{children:e.jsx("span",{className:"mc-gradient-text",children:i("missions.page.hero.title")})}),e.jsx("p",{children:i("missions.page.hero.description")}),e.jsxs("div",{className:"mc-hero-actions",children:[e.jsxs("button",{className:"mc-primary-button",type:"button",onClick:()=>{var s;return(s=document.getElementById("active-missions"))==null?void 0:s.scrollIntoView({behavior:"smooth"})},children:[e.jsx(U,{size:17}),i("missions.page.hero.viewMissions")]}),e.jsxs("button",{className:"mc-secondary-button",type:"button",onClick:()=>{var s;return(s=document.getElementById("reward-center"))==null?void 0:s.scrollIntoView({behavior:"smooth"})},children:[e.jsx(v,{size:17}),i("missions.page.hero.exploreRewards")]})]})]}),e.jsxs("aside",{className:"mc-commander-card",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"mc-status-line",children:[e.jsxs("span",{className:"mc-online",children:[e.jsx("span",{className:"mc-online-dot"}),i("missions.page.commander.online")]}),e.jsx(R,{size:22})]}),e.jsx("div",{className:"mc-rank-icon",children:e.jsx(X,{size:30})}),e.jsx("h2",{children:i("missions.page.commander.rank")}),e.jsx("p",{children:i("missions.page.commander.description")})]}),e.jsxs("div",{children:[e.jsxs("div",{className:"mc-progress-label",children:[e.jsx("span",{children:i("missions.page.commander.progress")}),e.jsxs("strong",{children:[C,"%"]})]}),e.jsx("div",{className:"mc-progress-track",children:e.jsx("div",{className:"mc-progress-fill",style:{width:`${C}%`}})})]})]})]}),e.jsxs("section",{className:"mc-stats","aria-label":i("missions.page.stats.aria"),children:[e.jsxs("article",{className:"mc-stat-card",children:[e.jsx("div",{className:"mc-stat-icon",children:e.jsx(W,{size:22})}),e.jsxs("div",{children:[e.jsx("span",{children:i("missions.page.stats.missionGp")}),e.jsx("strong",{children:V.toLocaleString(a)})]})]}),e.jsxs("article",{className:"mc-stat-card",children:[e.jsx("div",{className:"mc-stat-icon",children:e.jsx(ee,{size:22})}),e.jsxs("div",{children:[e.jsx("span",{children:i("missions.page.stats.rewardStatus")}),e.jsx("strong",{children:i("missions.page.stats.preview")})]})]}),e.jsxs("article",{className:"mc-stat-card",children:[e.jsx("div",{className:"mc-stat-icon",children:e.jsx(L,{size:22})}),e.jsxs("div",{children:[e.jsx("span",{children:i("missions.page.stats.badges")}),e.jsx("strong",{children:y>0?1:0})]})]}),e.jsxs("article",{className:"mc-stat-card",children:[e.jsx("div",{className:"mc-stat-icon",children:e.jsx(z,{size:22})}),e.jsxs("div",{children:[e.jsx("span",{children:i("missions.page.stats.missions")}),e.jsxs("strong",{children:[y,"/",f]})]})]})]}),e.jsxs("section",{className:"mc-section",id:"active-missions",children:[e.jsxs("header",{className:"mc-section-heading",children:[e.jsxs("div",{children:[e.jsx("h2",{children:i("missions.page.active.title")}),e.jsx("p",{children:i("missions.page.active.description")})]}),e.jsx("span",{className:"mc-section-count",children:i("missions.page.active.availableCount",{count:f})})]}),e.jsx("div",{className:"mc-mission-grid",children:o.map((s,c)=>{const d=s.icon,u=s.rawStatus==="completed",S=s.rawStatus==="claimed",k=s.rawStatus==="locked",j=s.displayStatus,I=x===s.id;return e.jsxs(K.article,{className:`mc-mission-card is-${j}`,initial:{opacity:0,y:18},animate:{opacity:1,y:0},transition:{delay:c*.07},children:[e.jsxs("div",{className:"mc-mission-top",children:[e.jsx("div",{className:"mc-mission-icon",children:e.jsx(d,{size:23})}),e.jsxs("span",{className:`mc-status-badge ${j}`,children:[k?e.jsx(A,{size:12}):u?e.jsx(E,{size:12}):e.jsx(P,{size:10}),i(`missions.page.status.${j}`)]})]}),e.jsxs("span",{className:"mc-mission-code",children:[s.id," · ",s.category]}),e.jsx("h3",{children:s.title}),e.jsx("p",{children:s.description}),e.jsxs("div",{className:"mc-mission-meta",children:[e.jsxs("div",{className:"mc-meta-item",children:[e.jsx("span",{children:i("missions.page.meta.difficulty")}),e.jsx("strong",{children:s.difficulty})]}),e.jsxs("div",{className:"mc-meta-item",children:[e.jsx("span",{children:i("missions.page.meta.duration")}),e.jsx("strong",{children:s.duration})]}),e.jsxs("div",{className:"mc-meta-item",children:[e.jsx("span",{children:i("missions.page.meta.reward")}),e.jsx("strong",{children:s.reward})]})]}),e.jsxs("footer",{className:"mc-mission-footer",children:[e.jsxs("div",{className:"mc-reward",children:[e.jsx(ie,{size:17}),i("missions.page.rewardPreview")]}),e.jsx("button",{className:`mc-mission-button ${j}`,type:"button",disabled:k||S||I||x!==null,onClick:()=>{if(u){_(s.id,s.cycleKey);return}$(s.id)},children:k?e.jsxs(e.Fragment,{children:[e.jsx(A,{size:16}),i("missions.page.button.locked")]}):S?e.jsxs(e.Fragment,{children:[e.jsx(z,{size:16}),i("missions.page.button.claimed")]}):u?e.jsx(e.Fragment,{children:I?e.jsxs(e.Fragment,{children:[e.jsx(G,{size:16}),i("missions.page.button.claiming")]}):e.jsxs(e.Fragment,{children:[e.jsx(v,{size:16}),i("missions.page.button.claimReward")]})}):e.jsxs(e.Fragment,{children:[s.action,e.jsx(se,{size:16})]})})]}),(l==null?void 0:l.missionId)===s.id&&e.jsx("p",{className:"mc-claim-error",role:"alert",children:l.message}),s.id==="join-community"&&w&&e.jsxs(K.div,{className:"mc-channels",initial:{opacity:0,height:0},animate:{opacity:1,height:"auto"},children:[ue.map(m=>{const D=m.icon;return e.jsxs("a",{className:"mc-channel-link",href:m.href,target:"_blank",rel:"noreferrer",children:[e.jsx(D,{size:20}),e.jsxs("span",{className:"mc-channel-copy",children:[e.jsx("strong",{children:m.name}),e.jsx("span",{children:"handleKey"in m&&typeof m.handleKey=="string"?i(m.handleKey):m.handle})]}),e.jsx(re,{size:14})]},m.name)}),e.jsxs("button",{className:"mc-primary-button mc-channel-complete",type:"button",onClick:()=>g(!1),children:[e.jsx(z,{size:17}),i("missions.page.button.closeChannels")]})]})]},s.id)})})]}),e.jsxs("section",{className:"mc-section mc-two-column",children:[e.jsxs("article",{className:"mc-panel",children:[e.jsxs("div",{className:"mc-panel-title",children:[e.jsx("h3",{children:i("missions.page.activity.title")}),e.jsx(G,{size:21})]}),e.jsx("div",{className:"mc-activity-list",children:be.map((s,c)=>{const d=c<2||y>=c-1;return e.jsxs("div",{className:"mc-activity-item",children:[e.jsx("div",{className:`mc-activity-marker ${d?"done":""}`,children:d?e.jsx(E,{size:16}):e.jsx(P,{size:13})}),e.jsxs("div",{children:[e.jsx("strong",{children:i(s.titleKey)}),e.jsx("p",{children:i(s.descriptionKey)})]})]},s.titleKey)})})]}),e.jsxs("article",{className:"mc-panel",id:"reward-center",children:[e.jsxs("div",{className:"mc-panel-title",children:[e.jsx("h3",{children:i("missions.page.rewards.title")}),e.jsx(v,{size:21})]}),e.jsx("div",{className:"mc-reward-grid",children:he.map(s=>{const c=s.icon;return e.jsxs("div",{className:"mc-reward-card",children:[e.jsx(c,{size:23}),e.jsx("h4",{children:i(s.titleKey)}),e.jsx("p",{children:i(s.descriptionKey)})]},s.titleKey)})}),e.jsxs("div",{className:"mc-disclaimer",children:[e.jsx(R,{size:19}),e.jsx("span",{children:i("missions.page.rewards.disclaimer")})]})]})]}),e.jsxs("section",{className:"mc-final-message",children:[e.jsx("span",{children:i("missions.page.final.eyebrow")}),e.jsx("h2",{children:i("missions.page.final.title")}),e.jsx("p",{children:i("missions.page.final.description")})]})]})]})}export{Ne as Missions};
