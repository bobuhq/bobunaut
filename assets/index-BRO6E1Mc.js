const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/BuilderAuthDialog-BwwKs1jA.js","assets/vendor-react-Db_inLa4.js","assets/vendor-C2bh2AFn.js","assets/vendor-icons-JbKY7JUy.js","assets/vendor-supabase-BRUXfWZX.js","assets/vendor-motion-DZA6fOcq.js","assets/BuilderAuthDialog-CID9O99u.css","assets/Genesis-DfiIvB02.js","assets/Home-CuigXnoL.js","assets/Home-NKR2_6ff.css","assets/Missions-DOaChSZx.js","assets/Galaxy-BE7YS2Zk.js","assets/GalaxyService-r9OlJZwp.js","assets/BuilderPassport-CPdcbrg-.js","assets/vendor-image-Br7REqB6.js","assets/BuilderPassport-1bcRq_46.css","assets/BuilderMining-ILvOREXK.js","assets/BuilderMining-CfPF2SRL.css","assets/BuilderIdentity-CyK7pN45.js","assets/BuilderIdentity-BUNBEQSc.css","assets/BuilderWallet-sFf0xoer.js","assets/BuilderWallet-CXTenaR7.css","assets/Leaderboard-BKmeJCtq.js","assets/AdminDashboard-DMtUngOq.js","assets/AdminUniverseHealth-Bxet1Cdb.js","assets/AdminLayout-YeVQkjQF.js","assets/AdminDashboard-PJ64ZfcY.css","assets/AdminBuilders-DXVO0tkH.js","assets/AdminRewardLedger-D523RIS9.js","assets/AdminMiningSessions-BKXjqWeP.js","assets/AdminSecurityCenter-CjegzjBN.js","assets/AdminAuditLogs-D-ESLnLD.js","assets/AdminAnalytics-DRwcCo4e.js","assets/AdminLogin-Cwv5Hrxg.js","assets/LanguageSetup-RjbgSsmk.js","assets/LanguageSetup-CPgPS1Vr.css","assets/PrivacyPolicy-Didk0pPR.js","assets/LegalPage-CxabXAB6.css","assets/TermsOfService-BvoSBOf3.js"])))=>i.map(i=>d[i]);
var xt=Object.defineProperty;var Et=(e,t,a)=>t in e?xt(e,t,{enumerable:!0,configurable:!0,writable:!0,value:a}):e[t]=a;var w=(e,t,a)=>Et(e,typeof t!="symbol"?t+"":t,a);import{r as d,j as r,N as de,O as ve,u as Se,a as Y,b as St,R as Bt,c as v,d as _t,B as kt}from"./vendor-react-Db_inLa4.js";import{c as At}from"./vendor-supabase-BRUXfWZX.js";import{O as It,U as Ne,P as Pt,C as Nt,W as Ct,T as jt,R as Lt,L as Ce,E as je,a as Le,b as Re,X as we,M as Rt,B as tt,S as rt,c as Tt,d as Ot,e as Gt,f as Ut}from"./vendor-icons-JbKY7JUy.js";import{A as Mt}from"./vendor-motion-DZA6fOcq.js";import"./vendor-C2bh2AFn.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))i(n);new MutationObserver(n=>{for(const s of n)if(s.type==="childList")for(const o of s.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function a(n){const s={};return n.integrity&&(s.integrity=n.integrity),n.referrerPolicy&&(s.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?s.credentials="include":n.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(n){if(n.ep)return;n.ep=!0;const s=a(n);fetch(n.href,s)}})();const Dt="modulepreload",zt=function(e){return"/"+e},Te={},p=function(t,a,i){let n=Promise.resolve();if(a&&a.length>0){let o=function(u){return Promise.all(u.map(b=>Promise.resolve(b).then(h=>({status:"fulfilled",value:h}),h=>({status:"rejected",reason:h}))))};document.getElementsByTagName("link");const l=document.querySelector("meta[property=csp-nonce]"),c=(l==null?void 0:l.nonce)||(l==null?void 0:l.getAttribute("nonce"));n=o(a.map(u=>{if(u=zt(u),u in Te)return;Te[u]=!0;const b=u.endsWith(".css"),h=b?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${u}"]${h}`))return;const y=document.createElement("link");if(y.rel=b?"stylesheet":Dt,b||(y.as="script"),y.crossOrigin="",y.href=u,c&&y.setAttribute("nonce",c),document.head.appendChild(y),b)return new Promise((B,_)=>{y.addEventListener("load",B),y.addEventListener("error",()=>_(new Error(`Unable to preload CSS for ${u}`)))})}))}function s(o){const l=new Event("vite:preloadError",{cancelable:!0});if(l.payload=o,window.dispatchEvent(l),!l.defaultPrevented)throw o}return n.then(o=>{for(const l of o||[])l.status==="rejected"&&s(l.reason);return t().catch(s)})},Vt="https://pvemtnmeewyaqgindocs.supabase.co",Ft="sb_publishable_xNnNUklnfhTK5Dv6V8L5Hg_rVXQ_Y3y",g=At(Vt,Ft),at=d.createContext(null);function Wt({children:e}){const[t,a]=d.useState(null),[i,n]=d.useState(!0);d.useEffect(()=>{let o=!0;g.auth.getSession().then(({data:c})=>{o&&(a(c.session),n(!1))});const{data:{subscription:l}}=g.auth.onAuthStateChange((c,u)=>{o&&(a(u),n(!1))});return()=>{o=!1,l.unsubscribe()}},[]);const s=d.useMemo(()=>({session:t,loading:i,authenticated:!!(t!=null&&t.user.id)}),[t,i]);return r.jsx(at.Provider,{value:s,children:e})}function D(){const e=d.useContext(at);if(!e)throw new Error("useAuthSession must be used inside AuthSessionProvider");return e}const ae=()=>({id:"builder-001",username:"New Builder",level:1,personalGp:0,pendingNetworkGp:0,eligibleNetworkGp:0,gp:0,reputation:0,inviteCode:"BOBU-GENESIS",identity:{telegram:!1,x:!1,instagram:!1,wallet:!1},passportUnlocked:!1,gpEnabled:!1,missionsUnlocked:!1,galaxyUnlocked:!1,referralCount:0}),ce=new Set,M={publish(e){ce.forEach(t=>t(e))},subscribe(e){return ce.add(e),()=>{ce.delete(e)}}},X=()=>new Date().toISOString(),qt=(e,t)=>{switch(t.type){case"IDENTITY_CONNECTED":return{...e,identity:{...e.identity,[t.provider]:!0}};case"IDENTITY_DISCONNECTED":return{...e,identity:{...e.identity,[t.provider]:!1}};case"BUILDER_RESET":return e;default:return e}},$t=e=>e.identity.telegram&&e.identity.x&&e.identity.instagram,Yt=e=>{const t=$t(e),a=t,i=t,n=t,s=e.level>=5||e.referralCount>=10;return{passportUnlocked:a,gpEnabled:i,missionsUnlocked:n,galaxyUnlocked:s}},Be=e=>{const t=Yt(e);return{...e,...t}};let K=Be(ae());const xe=new Set,it=()=>{xe.forEach(e=>e())},nt=e=>{K=Be(e),it()},Kt=e=>{if(e.type==="BUILDER_RESET"){nt(ae());return}K=Be(qt(K,e)),it()};M.subscribe(Kt);const R={getSnapshot(){return K},subscribe(e){return xe.add(e),()=>{xe.delete(e)}},restore(e){nt(e)},connectIdentity(e){M.publish({type:"IDENTITY_CONNECTED",provider:e,occurredAt:X()})},disconnectIdentity(e){M.publish({type:"IDENTITY_DISCONNECTED",provider:e,occurredAt:X()})},toggleIdentity(e){const t=K.identity[e];M.publish({type:t?"IDENTITY_DISCONNECTED":"IDENTITY_CONNECTED",provider:e,occurredAt:X()})},reset(){M.publish({type:"BUILDER_RESET",occurredAt:X()})}},Ht=()=>d.useSyncExternalStore(R.subscribe,R.getSnapshot,R.getSnapshot),st=["en","tr","fi","sv","de","fr","es","pt","ar","ru","zh","ja","ko"],ot=[{code:"en",label:"English",nativeLabel:"English",direction:"ltr"},{code:"tr",label:"Turkish",nativeLabel:"Türkçe",direction:"ltr"},{code:"fi",label:"Finnish",nativeLabel:"Suomi",direction:"ltr"},{code:"sv",label:"Swedish",nativeLabel:"Svenska",direction:"ltr"},{code:"de",label:"German",nativeLabel:"Deutsch",direction:"ltr"},{code:"fr",label:"French",nativeLabel:"Français",direction:"ltr"},{code:"es",label:"Spanish",nativeLabel:"Español",direction:"ltr"},{code:"ru",label:"Russian",nativeLabel:"Русский",direction:"ltr"},{code:"zh",label:"Chinese",nativeLabel:"中文",direction:"ltr"},{code:"ja",label:"Japanese",nativeLabel:"日本語",direction:"ltr"},{code:"ko",label:"Korean",nativeLabel:"한국어",direction:"ltr"},{code:"pt",label:"Portuguese",nativeLabel:"Português",direction:"ltr"},{code:"ar",label:"Arabic",nativeLabel:"العربية",direction:"rtl"}],_e={"app.loading":"Loading BOBU Universe…","common.language":"Language","common.loading":"Loading…","common.close":"Close","common.cancel":"Cancel","common.confirm":"Confirm","common.save":"Save","common.error":"Something went wrong.","auth.login":"Sign in","auth.logout":"Sign out","auth.googleLoginError":"Google sign-in failed: {{message}}","auth.logoutError":"Sign-out failed: {{message}}","nav.orbit":"Orbit","nav.commandDeck":"Command Deck","nav.genesis":"Genesis","nav.passport":"Passport","nav.wallet":"Wallet","nav.mining":"Mining","nav.missions":"Missions","nav.galaxy":"My Galaxy","nav.leaderboard":"Leaderboard","nav.openMenu":"Open navigation","nav.closeMenu":"Close navigation","common.cycle":"Cycle","auth.commander":"Commander","nav.mainNavigation":"Main navigation","nav.home":"BOBU Universe home","nav.walletUnderDevelopment":"Builder Wallet — Under Development","nav.lockedUnderDevelopment":"{{label}} — Locked, under development","nav.openMobileMenu":"Open navigation menu","nav.closeMobileMenu":"Close navigation menu","language.selectorLabel":"Select language","identity.eyebrow":"BOBU GENESIS ACCESS","identity.title":"Complete the Genesis Checkpoint","identity.description":"Join BOBU's official community channels to unlock your Builder Passport, activate GP and access missions.","identity.progress":"Community Progress","identity.telegram.label":"Join BOBU Telegram","identity.telegram.description":"Join the official BOBU Telegram community to enter the Genesis network.","identity.telegram.join":"Join Telegram","identity.telegram.connect":"Connect Telegram","identity.telegram.check":"Check Telegram Status","identity.telegram.retry":"Retry Telegram","identity.x.label":"Follow BOBU on X","identity.x.description":"Follow the official BOBU account for announcements, missions and launch updates.","identity.x.connect":"Connect X","identity.x.retry":"Retry X","identity.instagram.label":"Follow BOBU on Instagram","identity.instagram.description":"Follow BOBU on Instagram and become part of the visual Universe journey.","identity.instagram.connect":"Connect Instagram","identity.instagram.retry":"Retry Instagram","identity.wallet.label":"Solana Wallet","identity.wallet.description":"Wallet connection will become available for future on-chain rewards and claims.","identity.status.completed":"Completed","identity.status.completedCheck":"Completed ✓","identity.status.required":"Required","identity.status.inProgress":"In Progress","identity.status.actionRequired":"Action Required","identity.status.checking":"Checking...","identity.status.comingSoon":"Coming Soon","identity.unlock.passport":"Builder Passport","identity.unlock.gp":"BOBU GP","identity.unlock.missions":"Missions","identity.unlock.unlocked":"Unlocked","identity.unlock.locked":"Locked","identity.unlock.active":"Active","home.hero.eyebrow":"THE FIRST LIGHT IS ACTIVE","home.hero.titlePrefix":"We are","home.hero.titleHighlight":"building space.","home.hero.description":"Meet BUBO, the first explorer of an abandoned universe. Complete missions, uncover lost sectors and help build a new digital civilization.","home.hero.primaryAction":"Enter Mission Center","home.hero.secondaryAction":"Explore the Galaxy","home.hero.liveSignal":"LIVE SIGNAL · GENESIS SECTOR 01","home.hero.planetLabel":"GENESIS","home.hero.transmissionLabel":"INCOMING TRANSMISSION","home.hero.transmissionTitle":"BUBO HAS ENTERED THE SECTOR","home.hero.transmissionText":"Hi, Builder. I found an abandoned universe. Will you help me build it?","home.hero.transmissionAlt":"Transmission from BUBO","home.hero.signalStable":"Signal Stable","home.hero.sectorOnline":"Sector Online","home.hero.sectorStatus":"GENESIS SECTOR ONLINE","home.stats.buildersJoined":"Builders Joined","home.stats.galaxiesCreated":"Galaxies Created","home.stats.alliancesFormed":"Alliances Formed","home.stats.gpGenerated":"GP Generated","home.transmission.eyebrow":"LATEST TRANSMISSION","home.transmission.quote":"The universe is not waiting for heroes.","home.transmission.reply":"It is waiting for Builders.","home.transmission.author":"— Wizard BOBU","home.missions.eyebrow":"MISSION NETWORK","home.missions.title":"Your next move matters.","home.missions.description":"Begin with simple missions, earn visible progress and prepare for future community challenges.","home.missions.viewAll":"View all missions","home.missions.status.active":"ACTIVE","home.missions.status.comingSoon":"COMING SOON","home.missions.restoreSignal.title":"Restore the BOBU Signal","home.missions.restoreSignal.description":"Reconnect with Mission Control and receive the latest transmission.","home.missions.restoreSignal.reward":"250 GP","home.missions.joinChannels.title":"Join Official Channels","home.missions.joinChannels.description":"Connect with the official BOBU community across the network.","home.missions.joinChannels.reward":"600 GP","home.missions.arcade.title":"Enter Arcade Orbit","home.missions.arcade.description":"Playable missions and competitive challenges are approaching.","home.missions.arcade.reward":"Coming Soon","home.roadmap.eyebrow":"GALAXY ROADMAP","home.roadmap.title":"The universe expands in phases.","home.roadmap.description":"Each phase introduces a new layer of identity, participation and community-driven experiences.","home.roadmap.openMap":"Open Galactic Map","home.roadmap.introTitle":"Genesis is only the beginning.","home.roadmap.introDescription":"The current phase establishes the foundation of BOBU Universe. Missions, arcade experiences and collaborative sectors will continue expanding the network.","home.roadmap.progress":"UNIVERSE PROGRESS · 50%","home.roadmap.status.online":"ONLINE","home.roadmap.status.planned":"PLANNED","home.roadmap.phase1.code":"PHASE 01","home.roadmap.phase1.title":"Genesis Signal","home.roadmap.phase1.description":"Identity, narrative and the first sectors come online.","home.roadmap.phase2.code":"PHASE 02","home.roadmap.phase2.title":"Mission Control","home.roadmap.phase2.description":"Bobonauts complete missions and build visible progress.","home.roadmap.phase3.code":"PHASE 03","home.roadmap.phase3.title":"Arcade Expansion","home.roadmap.phase3.description":"Playable experiences and seasonal challenges arrive.","home.roadmap.phase4.code":"PHASE 04","home.roadmap.phase4.title":"Open Galaxy","home.roadmap.phase4.description":"New sectors and community-built experiences expand.","home.community.eyebrow":"BUILDER CIVILIZATION","home.community.title":"Not an audience. A civilization.","home.community.description":"BOBU Universe grows through participation. Explore the story, complete missions, create culture and help shape what comes next.","home.community.beginJourney":"Begin Your Journey","home.community.openDeck":"Open Command Deck","home.community.missions.title":"Missions","home.community.missions.description":"Complete objectives and grow your Bobonaut profile.","home.community.recognition.title":"Recognition","home.community.recognition.description":"Earn badges, rank progress and campaign eligibility.","home.community.discovery.title":"Discovery","home.community.discovery.description":"Explore sectors, signals and the evolving BOBU story.","home.final.eyebrow":"THE SIGNAL IS WAITING","home.final.title":"Your sector begins with one mission.","home.final.description":"Enter Mission Control, build your Bobonaut profile and become part of the expanding BOBU Universe.","home.final.primaryAction":"Enter Mission Control","home.final.secondaryAction":"Read the Genesis","passport.title":"Builder Passport","passport.defaultBuilder":"BOBU Builder","passport.defaultUsername":"builder","passport.avatarAlt":"BOBU Builder","passport.rank.masterBuilder":"Master Builder","passport.rank.architect":"Architect","passport.rank.commander":"Commander","passport.rank.navigator":"Navigator","passport.rank.explorer":"Explorer","passport.rank.newBuilder":"New Builder","passport.badge.activeBuilder":"Active Builder","passport.badge.genesisBuilder":"Genesis Builder","passport.badge.genesisPending":"Genesis Pending","passport.badge.verified":"Verified","passport.badge.verificationPending":"Verification Pending","passport.id.builderId":"Builder ID","passport.id.passport":"Passport","passport.id.status":"Status","passport.id.unlocked":"Unlocked","passport.id.initializing":"Initializing","passport.id.online":"Online","passport.id.guest":"Guest","passport.gp.title":"GP Command Center","passport.gp.subtitle":"Storage v2","passport.gp.personal":"Personal GP","passport.gp.personalDescription":"Earned directly by you","passport.gp.pendingNetwork":"Pending Network GP","passport.gp.pendingDescription":"Locked until eligibility","passport.gp.eligibleNetwork":"Eligible Network GP","passport.gp.eligibleDescription":"Counts toward Total GP","passport.gp.total":"Total GP","passport.gp.totalDescription":"Authoritative Builder balance","passport.progression.title":"Builder Progression","passport.progression.subtitle":"Live Core Data","passport.progression.gpRank":"GP Rank","passport.progression.reputation":"Reputation","passport.progression.network":"Network","passport.achievements.title":"Achievement Vault","passport.achievements.subtitle":"Builder Milestones","passport.achievements.genesisBuilder":"Genesis Builder","passport.achievements.genesisBuilderDescription":"Telegram + X","passport.achievements.identityVerified":"Identity Verified","passport.achievements.identityVerifiedDescription":"Trusted identity","passport.achievements.networkBuilder":"Network Builder","passport.achievements.networkBuilderDescription":"Invite network","passport.achievements.walletReady":"Wallet Ready","passport.achievements.walletReadyDescription":"Wallet identity","passport.identity.title":"Identity Matrix","passport.identity.telegram":"Telegram","passport.identity.x":"X","passport.identity.instagram":"Instagram","passport.identity.wallet":"BOBU Wallet","passport.identity.verified":"Verified","passport.identity.pending":"Pending","passport.journey.title":"Genesis Journey","passport.journey.passport":"Builder Passport","passport.journey.telegram":"Telegram Identity","passport.journey.x":"X Identity","passport.journey.genesis":"Genesis Status","passport.journey.wallet":"Wallet Activation","passport.journey.complete":"Complete","passport.journey.pending":"Pending","passport.network.title":"Builder Network","passport.network.inviteCode":"Invite Code","passport.network.referralLink":"Referral Link","passport.network.referralUnavailable":"Available after invite activation","passport.network.copyInviteCode":"Copy invite code","passport.network.copyReferralLink":"Copy referral link","passport.actions.copyBuilderId":"Copy Builder ID","passport.actions.builderIdCopied":"Builder ID Copied","passport.actions.share":"Share Passport","passport.actions.download":"Download Passport","passport.actions.linkCopied":"Passport link copied.","passport.share.title":"{{username}} — BOBU Builder Passport","passport.share.text":"Explore my Builder Passport in BOBU Universe — the world's first explorable Web3 social universe.","passport.share.gpRank":"GP RANK","passport.share.wallet":"Wallet","passport.share.connected":"Connected","passport.share.notConnected":"Not connected","passport.share.preparingPng":"Preparing PNG...","passport.share.downloadPng":"Download PNG","passport.share.imageAlt":"{{name}} Builder Passport","passport.signal.ariaLabel":"Builder invitation","passport.signal.title":"BUILDER INVITE","passport.signal.signIn":"🔒 Sign in to unlock your invite code.","passport.signal.shareTitle":"Join BOBU Universe","passport.signal.shareText":"Join my Builder Civilization network in BOBU Universe.","passport.signal.copied":"Copied","passport.signal.copyCode":"Copy code","passport.signal.copyLink":"Copy link","passport.signal.share":"Share","mining.hero.eyebrow":"BOBU Universe Protocol","mining.hero.title":"Builder Mining","mining.hero.description":"Activate your daily mining session, collect GP and strengthen your reputation across the BOBU Universe.","mining.status.completed":"COMPLETED","mining.status.active":"ACTIVE","mining.status.inactive":"INACTIVE","mining.status.readyToClaim":"Ready to Claim","mining.status.rewardReady":"Reward Ready","mining.status.readyToActivate":"Ready to Activate","mining.core.orbitAria":"BOBU mining orbit","mining.core.statusLabel":"Mining Status","mining.core.serverVerified":"Server Verified","mining.core.timeRemaining":"Time Remaining","mining.core.currentSession":"Current Session","mining.core.sessionProgress":"Session Progress","mining.core.processing":"Processing...","mining.core.claimGp":"Claim GP","mining.core.miningActive":"Mining Active","mining.core.activateMining":"Activate Mining","mining.session.kicker":"Live Mining Signal","mining.session.title":"Current Session","mining.session.claimableDescription":"Your verified 24-hour session is complete and ready to claim.","mining.session.activeDescription":"{{count}} active {{builderLabel}} currently support your mining rate.","mining.session.inactiveDescription":"Activate a server-verified 24-hour session to begin earning Personal GP.","mining.session.builderSingular":"Builder","mining.session.builderPlural":"Builders","mining.session.synchronizing":"Synchronizing...","mining.session.rewardReady":"Reward ready","mining.session.remaining":"{{time}} remaining","mining.session.readyForActivation":"Ready for activation","mining.session.status":"Status","mining.session.activeBuilders":"Active Builders","mining.session.baseRate":"Base Rate","mining.session.referralBonus":"Referral Bonus","mining.session.sessionReward":"Session Reward","mining.session.walletGp":"Wallet GP","mining.session.serverVerified":"Server Verified","mining.activation.claimedTitle":"Mining GP Claimed","mining.activation.activatedTitle":"Mining Session Activated","mining.activation.claimedDescription":"Your verified reward has been added to your GP balance.","mining.activation.activatedDescription":"Your server-verified 24-hour mining session has begun.","mining.history.sessionUnavailable":"Session unavailable","mining.history.eyebrow":"Verified Ledger","mining.history.title":"Mining History","mining.history.latest":"BOBU Core · Latest {{count}}","mining.history.synchronizing":"Synchronizing mining history…","mining.history.empty":"No claimed mining sessions yet.","mining.dashboard.noClaimRecorded":"No claim recorded","mining.dashboard.milestone7":"7 Day Consistency","mining.dashboard.milestone30":"30 Day Discipline","mining.dashboard.milestone100":"100 Day Veteran","mining.dashboard.milestoneLegendary":"Legendary Streak","mining.dashboard.currentStreak":"Current Streak","mining.dashboard.bestStreak":"Best Streak","mining.dashboard.lifetimeMined":"Lifetime Mined","mining.dashboard.claimedSessions":"Claimed Sessions","mining.dashboard.days":"{{count}} Days","mining.dashboard.verifiedActivity":"Verified Activity","mining.dashboard.calendarTitle":"30 Day Mining Calendar","mining.dashboard.claimed":"Claimed","mining.dashboard.today":"Today","mining.dashboard.noClaim":"No claim","mining.dashboard.bobuCore":"BOBU Core","mining.dashboard.intelligenceTitle":"Mining Intelligence","mining.dashboard.miningState":"Mining State","mining.dashboard.networkSupport":"Network Support","mining.dashboard.builders":"{{count}} Builders","mining.dashboard.walletBalance":"Wallet Balance","mining.dashboard.lastVerifiedClaim":"Last Verified Claim","mining.dashboard.base":"Base","mining.dashboard.referral":"Referral","mining.dashboard.total":"Total","mining.dashboard.nextMilestone":"Next Milestone","mining.dashboard.progress":"Progress {{value}}%","wallet.state.loading":"Loading Builder Wallet…","wallet.state.lockedTitle":"Builder Wallet Locked","wallet.state.lockedDescription":"Sign in to access your GP balance and reward history.","wallet.state.synchronizing":"Synchronizing GP ledger…","wallet.state.syncInterrupted":"Wallet Sync Interrupted","wallet.state.loadError":"Builder Wallet could not be loaded.","wallet.hero.eyebrow":"BUILDER FINANCIAL CORE","wallet.hero.title":"Builder Wallet","wallet.hero.description":"Your authoritative GP balance and Builder reward history.","wallet.hero.totalGp":"Total GP","wallet.hero.previewMode":"GP · Preview Mode","wallet.hero.synchronized":"Synchronized with Builder Core","wallet.stats.personalGp":"Personal GP","wallet.stats.eligibleNetworkGp":"Eligible Network GP","wallet.stats.pendingNetworkGp":"Pending Network GP","wallet.stats.totalGp":"Total GP","wallet.stats.lockedGp":"Locked GP","wallet.stats.availableGp":"Available GP","wallet.stats.loadedRewards":"Loaded Rewards","wallet.stats.transactions":"Transactions","wallet.analytics.eyebrow":"GP INTELLIGENCE","wallet.analytics.title":"Wallet Command Center","wallet.analytics.description":"Live performance calculated from your secured GP ledger.","wallet.analytics.periodAria":"Analytics period","wallet.analytics.days":"{{count}} Days","wallet.analytics.netChange":"Net GP Change","wallet.analytics.synchronized":"Ledger synchronized","wallet.analytics.chartAria":"{{count}}-day GP performance chart","wallet.analytics.today":"Today","wallet.analytics.periodRewards":"{{count}}-Day Rewards","wallet.analytics.dailyAverage":"Daily Average","wallet.analytics.bestDay":"Best Day","wallet.analytics.activeDays":"Active Days","wallet.ledger.eyebrow":"GP LEDGER","wallet.ledger.title":"Recent Activity","wallet.ledger.latest":"Latest {{count}}","wallet.ledger.filtersAria":"Transaction filters","wallet.ledger.filterAll":"All","wallet.ledger.filterSocial":"Social","wallet.ledger.filterMining":"Mining","wallet.ledger.filterMissions":"Missions","wallet.ledger.filterReferral":"Referral","wallet.ledger.filterMarketplace":"Marketplace","wallet.ledger.searchPlaceholder":"Search transactions...","wallet.ledger.searchAria":"Search transactions","wallet.ledger.openDetailsAria":"Open {{label}} transaction details","wallet.ledger.noMatches":"No matching transactions","wallet.ledger.empty":"No GP activity yet","wallet.ledger.noMatchesDescription":"Try another filter or search term.","wallet.ledger.emptyDescription":"Mining, mission and community rewards will appear here.","wallet.ledger.clearFilters":"Clear Filters","wallet.drawer.unsupportedValue":"Unsupported value","wallet.drawer.defaultProvider":"Builder Core","wallet.drawer.closeAria":"Close transaction details","wallet.drawer.eyebrow":"TRANSACTION DETAILS","wallet.drawer.gpReceived":"GP Received","wallet.drawer.gpSpent":"GP Spent","wallet.drawer.status":"Transaction Status","wallet.drawer.completed":"Completed","wallet.drawer.verified":"VERIFIED","wallet.drawer.provider":"Provider","wallet.drawer.rewardType":"Reward Type","wallet.drawer.entryType":"Entry Type","wallet.drawer.credit":"Credit","wallet.drawer.debit":"Debit","wallet.drawer.created":"Created","wallet.drawer.transactionId":"Transaction ID","wallet.drawer.explorer":"BOBU Explorer","wallet.drawer.explorerDescription":"Public transaction explorer activates with the network layer.","wallet.drawer.locked":"Locked","wallet.drawer.metadata":"TRANSACTION METADATA","wallet.drawer.fields":"{{count}} fields","wallet.future.eyebrow":"WALLET EVOLUTION","wallet.future.title":"Future Network Modules","wallet.future.description":"These modules remain secured until the BOBU economy enters its next development stage.","wallet.future.onChainWallet":"On-chain Wallet","wallet.future.tokenClaim":"Token Claim","wallet.future.nftInventory":"NFT Inventory","wallet.future.marketplace":"BOBU Marketplace","wallet.future.locked":"LOCKED","builderStatus.unavailable":"Unavailable","builderStatus.aria":"Builder status","builderStatus.eyebrow":"BUILDER CORE STATUS","builderStatus.title":"Builder Status","builderStatus.description":"Live identity, GP and ecosystem synchronization.","builderStatus.coreOnline":"Core Online","builderStatus.identity":"Builder Identity","builderStatus.defaultBuilder":"BOBU Builder","builderStatus.builderGp":"Builder GP","builderStatus.progressionSource":"Single progression source","builderStatus.level":"Builder Level","builderStatus.poweredByGp":"Powered entirely by GP","builderStatus.lifetimeEarned":"Lifetime Earned","builderStatus.verifiedRewards":"Verified Builder rewards","builderStatus.wallet":"Wallet","builderStatus.walletDescription":"Connected to Builder Core","builderStatus.genesis":"Genesis","builderStatus.genesisDescription":"Genesis network access","builderStatus.mining":"Mining","builderStatus.miningDescription":"24-hour Builder sessions","builderStatus.status.active":"Active","builderStatus.status.synced":"Synced","builderStatus.status.inactive":"Inactive","builderStatus.status.pending":"Pending","builderStatus.status.locked":"Locked","missions.catalog.startMining.title":"Start Mining","missions.catalog.startMining.description":"Start one mining session.","missions.presentation.category.mission":"MISSION","missions.presentation.category.daily":"DAILY","missions.presentation.category.community":"COMMUNITY","missions.presentation.category.creator":"CREATOR","missions.presentation.category.arcade":"ARCADE","missions.presentation.difficulty.easy":"Easy","missions.presentation.difficulty.medium":"Medium","missions.presentation.difficulty.unknown":"Unknown","missions.presentation.duration.oneMinute":"1 min","missions.presentation.duration.threeMinutes":"3 min","missions.presentation.duration.tenMinutes":"10 min","missions.presentation.duration.comingSoon":"Coming Soon","missions.presentation.duration.unknown":"Unknown","missions.presentation.action.startMining":"Start Mining","missions.presentation.action.openChannels":"Open Channels","missions.presentation.action.startCreating":"Start Creating","missions.presentation.action.viewMission":"View Mission","missions.presentation.noGp":"No GP","missions.page.claimError":"Mission reward could not be claimed.","missions.page.hero.kicker":"PHASE 02 · SIGNAL ACTIVE","missions.page.hero.title":"MISSION CONTROL","missions.page.hero.description":"Every mission shapes the future of BOBU Universe. Complete missions, earn progress, unlock future opportunities and become an active Bobonaut.","missions.page.hero.viewMissions":"View Active Missions","missions.page.hero.exploreRewards":"Explore Rewards","missions.page.commander.online":"NETWORK ONLINE","missions.page.commander.rank":"Cadet Bobonaut","missions.page.commander.description":"Complete missions to build your profile and unlock the next Bobonaut rank.","missions.page.commander.progress":"RANK PROGRESS","missions.page.stats.aria":"Mission statistics","missions.page.stats.missionGp":"MISSION GP","missions.page.stats.rewardStatus":"REWARD STATUS","missions.page.stats.preview":"PREVIEW","missions.page.stats.badges":"BADGES","missions.page.stats.missions":"MISSIONS","missions.page.active.title":"Active Missions","missions.page.active.description":"Start with simple actions. Future chapters will introduce games, seasonal challenges and verified reward campaigns.","missions.page.active.availableCount":"{{count}} MISSIONS AVAILABLE","missions.page.status.locked":"LOCKED","missions.page.status.available":"AVAILABLE","missions.page.status.completed":"COMPLETED","missions.page.status.claimed":"CLAIMED","missions.page.meta.difficulty":"DIFFICULTY","missions.page.meta.duration":"DURATION","missions.page.meta.reward":"REWARD","missions.page.rewardPreview":"GP reward preview","missions.page.button.locked":"Locked","missions.page.button.claimed":"Claimed","missions.page.button.claiming":"Claiming...","missions.page.button.claimReward":"Claim Reward","missions.page.button.closeChannels":"Close Channels","missions.page.social.officialCommunity":"Official Community","missions.page.activity.title":"Mission Activity","missions.page.activity.controlAccess.title":"Mission Control Access","missions.page.activity.controlAccess.description":"Your Bobonaut profile entered the mission network.","missions.page.activity.signalDetected.title":"Official Signal Detected","missions.page.activity.signalDetected.description":"BOBU Universe communication channels are online.","missions.page.activity.firstMission.title":"Complete First Mission","missions.page.activity.firstMission.description":"Finish one active mission to begin your progress.","missions.page.activity.firstBadge.title":"Unlock First Badge","missions.page.activity.firstBadge.description":"Earn recognition through verified participation.","missions.page.rewards.title":"Reward Center","missions.page.rewards.giftCards.title":"Gift Card Campaigns","missions.page.rewards.giftCards.description":"Limited promotional missions with clear campaign rules.","missions.page.rewards.airdrops.title":"Selected Airdrops","missions.page.rewards.airdrops.description":"Eligibility opportunities tied to verified mission activity.","missions.page.rewards.badges.title":"Exclusive Badges","missions.page.rewards.badges.description":"Permanent recognition for active Bobonauts and creators.","missions.page.rewards.leaderboard.title":"Leaderboard Access","missions.page.rewards.leaderboard.description":"Future seasonal rankings for missions and arcade scores.","missions.page.rewards.disclaimer":"Mission completion creates progress or campaign eligibility. It does not guarantee a financial reward unless official campaign rules explicitly state otherwise.","missions.page.final.eyebrow":"THE SIGNAL IS LIVE","missions.page.final.title":"We Are Building Space.","missions.page.final.description":"Complete missions. Support the community. Help expand BOBU Universe.","galaxy.error.inviterLoad":"Galaxy inviter could not be loaded","galaxy.error.dataLoad":"Galaxy data could not be loaded.","galaxy.status.active":"Active","galaxy.status.pending":"Pending","galaxy.image.builderAlt":"BOBU Builder","galaxy.image.inviterAlt":"Inviting BOBU Builder","galaxy.image.kingAlt":"King BOBU","galaxy.profile.genesisBuilder":"Genesis Builder","galaxy.profile.builderLevel":"BOBU Builder · Level {{level}}","galaxy.profile.nebulaRank":"Nebula Rank {{level}}","galaxy.profile.kingBobu":"KING BOBU","galaxy.profile.nebulaCore":"NEBULA CORE","galaxy.sidebar.personalGp":"Personal GP","galaxy.sidebar.pendingNetworkGp":"Pending Network GP","galaxy.sidebar.eligibleNetworkGp":"Eligible Network GP","galaxy.sidebar.totalGp":"Total GP","galaxy.sidebar.inviteCode":"Invite Code","galaxy.sidebar.activeCircle":"Active Circle","galaxy.invite.title":"Invite New Builders","galaxy.invite.description":"Share your portal link. Every verified Builder becomes a new branch in your Galaxy.","galaxy.invite.unavailable":"Referral link unavailable","galaxy.invite.copyAria":"Copy referral link","galaxy.invite.copiedAria":"Referral link copied","galaxy.top.totalBuilders":"Total Builders","galaxy.top.activeNow":"Active Now","galaxy.top.totalGp":"Total GP","galaxy.top.rank":"Galaxy Rank","galaxy.network.title":"Galaxy Network","galaxy.network.description":"Your complete Builder referral universe.","galaxy.network.online":"Galaxy Online","galaxy.network.invitedBy":"Invited By","galaxy.network.builderFallback":"Builder {{id}}","galaxy.network.inviterMeta":"Level {{level}} · {{gp}} GP","galaxy.network.loading":"Loading Galaxy network…","galaxy.network.empty":"You have not invited any Builders yet.","galaxy.footer.statusTitle":"Network Status","galaxy.footer.activeBuilder":"Active Builder","galaxy.footer.pendingActivation":"Pending Activation","galaxy.footer.referralBranch":"Referral Branch","galaxy.footer.summaryTitle":"Network Summary","galaxy.footer.totalNetwork":"Total Network","galaxy.footer.builderCount":"{{count}} Builders","galaxy.footer.verifiedConnections":"Verified Connections","galaxy.footer.pendingBuilders":"Pending Builders","galaxy.footer.nextLevel":"Next Galaxy Level","galaxy.footer.ready":"Ready","galaxy.footer.remaining":"{{count}} remaining","leaderboard.empty.description":"Builder rankings will appear as the community earns GP.","leaderboard.empty.title":"The first stars are forming","leaderboard.entry.level":"Level {{level}}","leaderboard.error.load":"The Builder rankings could not be loaded.","leaderboard.error.title":"Ranking signal interrupted","leaderboard.hero.eyebrow":"Live Universe Rankings","leaderboard.hero.subtitle":"The strongest Builders shaping the BOBU Universe. Earn GP, complete missions and rise through the stars.","leaderboard.hero.titleLine1":"Global Builder","leaderboard.hero.titleLine2":"Leaderboard","leaderboard.loading.description":"Calculating the current Builder rankings.","leaderboard.loading.title":"Scanning the universe...","leaderboard.myRank.builderGp":"Builder GP","leaderboard.myRank.level":"Level","leaderboard.myRank.rank":"Rank","leaderboard.myRank.title":"Your Position","leaderboard.section.liveRanking":"Live Ranking","leaderboard.section.topBuilders":"Top 20 Builders","leaderboard.stats.leadingBuilder":"Leading Builder","leaderboard.stats.top20Gp":"Top 20 GP","leaderboard.stats.visibleBuilders":"Visible Builders","auth.dialog.builderName.invalid":"Use between 3 and 32 characters.","auth.dialog.builderName.label":"Builder Name","auth.dialog.builderName.placeholder":"Choose your Builder identity","auth.dialog.builderName.ready":"Builder Name is ready.","auth.dialog.closeAria":"Close authentication window","auth.dialog.confirmPassword.label":"Confirm password","auth.dialog.confirmPassword.match":"Passwords match.","auth.dialog.confirmPassword.noMatch":"Passwords do not match.","auth.dialog.confirmPassword.placeholder":"Enter password again","auth.dialog.description.recovery":"Receive a secure password recovery link.","auth.dialog.description.signIn":"Continue your journey across BOBU Universe.","auth.dialog.description.signUp":"Create your secure Builder identity.","auth.dialog.email.label":"Email address","auth.dialog.email.placeholder":"builder@example.com","auth.dialog.emailDivider":"or continue with email","auth.dialog.eyebrow":"Builder Identity Gateway","auth.dialog.footer.alreadyBuilder":"Already a Builder?","auth.dialog.footer.createAccount":"Create account","auth.dialog.footer.forgotPassword":"Forgot password?","auth.dialog.footer.newToBobu":"New to BOBU?","auth.dialog.footer.returnToSignIn":"Return to sign in","auth.dialog.footer.signIn":"Sign in","auth.dialog.google":"Continue with Google","auth.dialog.legal.and":"and","auth.dialog.legal.prefix":"I have read and agree to the","auth.dialog.legal.privacy":"Privacy Policy","auth.dialog.legal.terms":"Terms of Service","auth.dialog.message.accountCreated":"Account created. Check your email to confirm your BOBU account.","auth.dialog.message.recoverySent":"Password recovery instructions were sent to your email.","auth.dialog.password.hide":"Hide passwords","auth.dialog.password.label":"Password","auth.dialog.password.medium":"Medium","auth.dialog.password.placeholder":"Minimum 8 characters","auth.dialog.password.ruleLength":"At least 8 characters","auth.dialog.password.ruleLowercase":"Lowercase letter","auth.dialog.password.ruleNumber":"Number","auth.dialog.password.ruleSymbol":"Special character","auth.dialog.password.ruleUppercase":"Uppercase letter","auth.dialog.password.show":"Show passwords","auth.dialog.password.strength":"Password strength","auth.dialog.password.strong":"Strong","auth.dialog.password.weak":"Weak","auth.dialog.securityNote":"Secured by BOBU Identity Gateway","auth.dialog.submit.help":"Complete all required security fields to create your account.","auth.dialog.submit.recovery":"Send Recovery Link","auth.dialog.submit.signIn":"Sign In","auth.dialog.submit.signUp":"Create Builder Account","auth.dialog.title.recovery":"Recover Account","auth.dialog.title.signIn":"Enter BOBU Universe","auth.dialog.title.signUp":"Create Builder Account","auth.dialog.validation.authenticationFailed":"Authentication could not be completed.","auth.dialog.validation.builderName":"Builder Name must contain between 3 and 32 characters.","auth.dialog.validation.emailRequired":"Enter your email address.","auth.dialog.validation.legalRequired":"You must accept the Terms of Service and Privacy Policy.","auth.dialog.validation.passwordMinimum":"Password must contain at least 8 characters.","auth.dialog.validation.passwordMismatch":"Passwords do not match.","auth.dialog.validation.strongPassword":"Password must include uppercase and lowercase letters, a number, a symbol, and at least 8 characters.","home.liveUniverse.activity.awaiting":"Awaiting live transmissions","home.liveUniverse.activity.description":"Verified Builder activity will appear here when the live event stream is connected.","home.liveUniverse.activity.kicker":"NETWORK ACTIVITY","home.liveUniverse.activity.live":"LIVE","home.liveUniverse.activity.systemListening":"SYSTEM LISTENING FOR NEW TRANSMISSIONS","home.liveUniverse.activity.title":"Live signals","home.liveUniverse.era":"GENESIS ERA","home.liveUniverse.expansion":"UNIVERSE EXPANSION","home.liveUniverse.kicker":"LIVE UNIVERSE","home.liveUniverse.metrics.builders.detail":"{{count}} joined this week","home.liveUniverse.metrics.builders.label":"Builders Joined","home.liveUniverse.metrics.genesis.detail":"New Builders in the last 7 days","home.liveUniverse.metrics.genesis.label":"Genesis Progress","home.liveUniverse.metrics.gp.detail":"Total Builder GP","home.liveUniverse.metrics.gp.label":"GP Generated","home.liveUniverse.metrics.status.detail":"All core systems operational","home.liveUniverse.metrics.status.label":"Universe Status","home.liveUniverse.metrics.status.value":"ONLINE","home.liveUniverse.title":"The Genesis network is alive.","home.journey.cta":"START YOUR GALAXY","home.journey.description.emphasis":"real Builder","home.journey.description.prefix":"Every Star represents a","home.journey.description.suffix":". Every new connection grows your constellation. Every constellation helps shape the BOBU Universe.","home.journey.kicker":"THE BUILDER'S JOURNEY","home.journey.manifesto.description":"This is not a referral list. It is a living map of real people, real communities and every connection that helped build the future.","home.journey.manifesto.title":"One Builder creates one Star. Many Galaxies create the BOBU Universe.","home.journey.milestone.hundred.label":"Builders","home.journey.milestone.hundred.text":"Your first constellation begins to shine.","home.journey.milestone.hundredThousand.label":"Builders","home.journey.milestone.hundredThousand.text":"The BOBU Universe becomes a living ecosystem.","home.journey.milestone.one.label":"Builder","home.journey.milestone.one.text":"Every journey begins with one real person and one first Star.","home.journey.milestone.thousand.label":"Builders","home.journey.milestone.thousand.text":"Your Galaxy starts taking shape across the network.","home.journey.title":"Your story begins with one Star.","home.galacticSky.actions.openBuilderGalaxy":"OPEN BUILDER GALAXY","home.galacticSky.actions.sendAllianceRequest":"SEND ALLIANCE REQUEST","home.galacticSky.actions.viewGalaxy":"VIEW GALAXY","home.galacticSky.builderNumber":"Builder #{{id}}","home.galacticSky.core.label":"GALAXY CORE","home.galacticSky.core.you":"YOU","home.galacticSky.daysAgo":"{{count}} days ago","home.galacticSky.description":"Each new Builder receives a permanent position inside the BOBU Universe. As the community grows, constellations form, galaxies expand and the map becomes alive.","home.galacticSky.footer.buildersConnected":"{{count}} BUILDERS CONNECTED","home.galacticSky.footer.galaxiesCreated":"{{count}} GALAXIES CREATED","home.galacticSky.footer.newStarsThisWeek":"{{count}} NEW STARS THIS WEEK","home.galacticSky.kicker":"LIVING GALAXY","home.galacticSky.profile.aria":"Builder profile","home.galacticSky.profile.closeAria":"Close Builder profile","home.galacticSky.profile.label":"BUILDER PROFILE","home.galacticSky.profile.online":"ONLINE","home.galacticSky.profile.selectedBuilder":"SELECTED BUILDER","home.galacticSky.starAria":"Builder {{id}}","home.galacticSky.stats.gp":"GP","home.galacticSky.stats.joined":"JOINED","home.galacticSky.stats.sector":"SECTOR","home.galacticSky.stats.stars":"STARS","home.galacticSky.title":"Every Star is a real Builder.","home.galacticSky.tooltip.joined":"Joined","home.galacticSky.tooltip.rank":"Rank","home.galacticSky.visibleStars":"VISIBLE STARS","ai.analyzing":"Analyzing your Builder journey...","ai.aria":"BOBU AI assistant","ai.builderLabel":"BUILDER","ai.closeLabel":"Close BOBU AI","ai.messageTooLong":"Messages are limited to 1,200 characters.","ai.name":"BOBU AI","ai.online":"BUILDER INTELLIGENCE ONLINE","ai.openLabel":"Open BOBU AI","ai.placeholder":"Ask BOBU AI...","ai.requestFailed":"BOBU AI request failed. Please try again.","ai.responseUnavailable":"BOBU AI could not generate a response.","ai.sendLabel":"Send message","ai.sessionFailed":"Your session could not be verified. Please sign in again.","ai.signInRequired":"Please sign in to use BOBU AI.","ai.subtitle":"Builder Intelligence","ai.welcome":"Welcome Builder. I can guide you through BOBU Universe, Mining, GP, Wallet, Passport, Missions and Galaxy.","onboarding.language.eyebrow":"BOBU LANGUAGE PROTOCOL","onboarding.language.title":"Choose your universe language","onboarding.language.description":"Confirm the language that will guide your BOBU Universe experience. You can change it later.","onboarding.language.detected":"Current language","onboarding.language.confirm":"Confirm language","onboarding.language.saving":"Saving language...","onboarding.language.saveError":"Your language preference could not be saved. Please try again.","onboarding.language.restoreError":"Your Builder preferences could not be restored securely.","onboarding.language.retry":"Try again","home.network.eyebrow":"BOBU NETWORK","home.network.title":"Your Universe. In Your Pocket.","home.network.description":"The official mobile gateway to BOBU Universe. Mine, explore, manage your Builder identity and stay connected wherever you go.","home.network.features.mining":"24-hour Mining","home.network.features.passport":"Builder Passport","home.network.features.wallet":"BOBU Wallet","home.network.features.missions":"Missions","home.network.features.galaxy":"My Galaxy","home.network.features.ai":"BOBU AI","home.network.availableOn":"Available on","home.network.comingSoon":"Coming Soon","home.network.appStore":"App Store","home.network.googlePlay":"Google Play","home.network.release":"Launching with the official BOBU Universe release.","home.network.imageAlt":"BOBU Network official mobile application","home.network.officialApp":"OFFICIAL MOBILE APP"},Oe="bobu.preferred-language",Q="en",re={en:_e},Z={},Jt={tr:async()=>(await p(()=>import("./tr-pPXycWLk.js"),[])).tr,fi:async()=>(await p(()=>import("./fi-DbruR-UB.js"),[])).fi,sv:async()=>(await p(()=>import("./sv-XSPme2E9.js"),[])).sv,de:async()=>(await p(()=>import("./de-B3h0_gJU.js"),[])).de,fr:async()=>(await p(()=>import("./fr-B-kiC-Jg.js"),[])).fr,es:async()=>(await p(()=>import("./es-SE_krjPM.js"),[])).es,pt:async()=>(await p(()=>import("./pt-1exqwD0y.js"),[])).pt,ar:async()=>(await p(()=>import("./ar-CVfdvckO.js"),[])).ar,ru:async()=>(await p(()=>import("./ru-BWuFb0Ke.js"),[])).ru,zh:async()=>(await p(()=>import("./zh-CSDYHVLK.js"),[])).zh,ja:async()=>(await p(()=>import("./ja-BQpxeZda.js"),[])).ja,ko:async()=>(await p(()=>import("./ko-fWBngWRk.js"),[])).ko};function Xt(e){return!!(e&&st.includes(e))}function Ge(e){if(!e)return null;const t=e.trim().toLowerCase().split("-")[0];return Xt(t)?t:null}function Qt(e,t){return t?Object.entries(t).reduce((a,[i,n])=>a.replaceAll(`{{${i}}}`,String(n)),e):e}async function Zt(e){const t=re[e];if(t)return t;const a=Z[e];if(a)return a;const i=Jt[e];if(!i)return _e;const n=i().then(s=>(re[e]=s,delete Z[e],s)).catch(s=>{throw delete Z[e],s});return Z[e]=n,n}const I={defaultLanguage:Q,detectBrowserLanguage(){if(typeof navigator>"u")return Q;const e=[...navigator.languages??[],navigator.language];for(const t of e){const a=Ge(t);if(a)return a}return Q},getStoredLanguage(){if(typeof window>"u")return null;try{return Ge(window.localStorage.getItem(Oe))}catch{return null}},storeLanguage(e){if(!(typeof window>"u"))try{window.localStorage.setItem(Oe,e)}catch{}},resolveInitialLanguage(){return this.getStoredLanguage()??this.detectBrowserLanguage()??Q},isLanguageLoaded(e){return!!re[e]},loadLanguage:Zt,translate(e,t,a){var n;const i=((n=re[e])==null?void 0:n[t])??_e[t]??t;return Qt(i,a)},getDirection(e){var t;return((t=ot.find(a=>a.code===e))==null?void 0:t.direction)??"ltr"}},lt=()=>({preferredLanguage:I.resolveInitialLanguage(),themePreference:"system",motionPreference:"system",languageSetupCompleted:!1,languageConfirmedAt:null});let A={preferences:lt(),source:"local",isRestoring:!1,isSaving:!1,lastError:null};const Ee=new Set,er=()=>{Ee.forEach(e=>e())},O=e=>{A=e,er()},E={getSnapshot(){return A},subscribe(e){return Ee.add(e),()=>{Ee.delete(e)}},restore(e){O({preferences:e,source:"server",isRestoring:!1,isSaving:!1,lastError:null})},updateLocal(e){const t={...A.preferences,...e};e.preferredLanguage&&I.storeLanguage(e.preferredLanguage),O({...A,preferences:t,lastError:null})},setRestoring(e){O({...A,isRestoring:e,lastError:e?null:A.lastError})},setSaving(e){O({...A,isSaving:e,lastError:e?null:A.lastError})},setError(e){const t=e instanceof Error?e.message:"Unknown preferences error";O({...A,isRestoring:!1,isSaving:!1,lastError:t})},reset(){O({preferences:lt(),source:"local",isRestoring:!1,isSaving:!1,lastError:null})}},dt=d.createContext(null);function tr({children:e}){const a=d.useSyncExternalStore(E.subscribe,E.getSnapshot,E.getSnapshot).preferences.preferredLanguage,[i,n]=d.useState(0),s=d.useRef(0),o=I.getDirection(a),l=d.useCallback(b=>{const h=s.current+1;s.current=h,I.loadLanguage(b).then(()=>{s.current===h&&E.updateLocal({preferredLanguage:b})}).catch(y=>{console.error(`Failed to load ${b} locale:`,y)})},[]);d.useEffect(()=>{let b=!0;return I.loadLanguage(a).then(()=>{b&&n(h=>h+1)}).catch(h=>{console.error(`Failed to restore ${a} locale:`,h)}),()=>{b=!1}},[a]);const c=d.useCallback((b,h)=>I.translate(a,b,h),[a,i]);d.useEffect(()=>{document.documentElement.lang=a,document.documentElement.dir=o},[a,o]);const u=d.useMemo(()=>({language:a,direction:o,languages:ot,setLanguage:l,t:c}),[a,o,l,c]);return r.jsx(dt.Provider,{value:u,children:e})}function ie(){const e=d.useContext(dt);if(!e)throw new Error("useLanguage must be used inside LanguageProvider");return e}const G=e=>{const t=Number(e??0);return Number.isFinite(t)?t:0},rr=e=>({sessionId:e.session_id,serverNow:e.server_now,startedAt:e.started_at,endsAt:e.ends_at,status:e.status,active:e.active===!0,claimable:e.claimable===!0,activeReferralCount:G(e.active_referral_count),baseRatePerHour:G(e.base_rate_per_hour),referralBonusRate:G(e.referral_bonus_rate),totalRatePerHour:G(e.total_rate_per_hour),rewardGp:G(e.reward_gp),walletGp:G(e.wallet_gp)}),ar=e=>Array.isArray(e)?e[0]??null:e,ct={async getState(){const{data:e,error:t}=await g.rpc("get_my_mining_state");if(t)throw new Error(t.message);const a=ar(e);if(!a)throw new Error("Mining state was not returned.");return rr(a)},async start(){const{error:e}=await g.rpc("start_builder_mining");if(e)throw new Error(e.message);return this.getState()},async claim(){const{error:e}=await g.rpc("claim_builder_mining");if(e)throw new Error(e.message);return this.getState()}},ir=d.lazy(()=>p(()=>import("./BuilderAuthDialog-BwwKs1jA.js"),__vite__mapDeps([0,1,2,3,4,5,6]))),Ue=[{to:"/",labelKey:"nav.orbit",icon:It,locked:!1},{to:"/identity",labelKey:"nav.genesis",icon:Ne,locked:!1},{to:"/mining",labelKey:"nav.mining",icon:Pt,locked:!1},{to:"/galaxy",labelKey:"nav.galaxy",icon:Nt,locked:!1},{to:"/wallet",labelKey:"nav.wallet",icon:Ct,locked:!1},{to:"/leaderboard",labelKey:"nav.leaderboard",icon:jt,locked:!1},{to:"/passport",labelKey:"nav.passport",icon:Ne,locked:!1},{to:"/missions",labelKey:"nav.missions",icon:Lt,locked:!1}],ut="/",nr=`${ut}images/bobu/logo.png`,Me=`${ut}images/bobu/avatar.png`;function sr(){var Ae,Ie,Pe;const{session:e,loading:t}=D(),{language:a,languages:i,setLanguage:n,t:s}=ie(),[o,l]=d.useState(!1),[c,u]=d.useState(!1),[b,h]=d.useState(nr),[y,B]=d.useState(!0),[_,T]=d.useState(!1),[H,f]=d.useState(!1),x=Ht();d.useEffect(()=>{const m=()=>{l(!1)};return window.addEventListener("resize",m),()=>{window.removeEventListener("resize",m)}},[]);const ne=()=>{if(b!==Me){h(Me);return}B(!1)},z=()=>{l(!1),u(!0)},P=async()=>{const{error:m}=await g.auth.signOut({scope:"local"});if(m){alert(s("auth.logoutError",{message:m.message}));return}l(!1),window.location.href="/"},V=()=>{l(!1)},N=()=>{l(!1),window.dispatchEvent(new CustomEvent("bobu-ai:open"))},S=e==null?void 0:e.user;d.useEffect(()=>{if(!S){T(!1),f(!1);return}let m=!1;return(async()=>{f(!0);try{const k=await ct.getState();m||T(k.active===!0)}catch(k){console.error("Navigation mining status failed:",k),m||T(!1)}finally{m||f(!1)}})(),()=>{m=!0}},[S,o]);const J=(Ae=S==null?void 0:S.user_metadata)==null?void 0:Ae.avatar_url,j=((Ie=S==null?void 0:S.user_metadata)==null?void 0:Ie.full_name)||((Pe=S==null?void 0:S.email)==null?void 0:Pe.split("@")[0])||s("auth.commander"),ft=new Intl.NumberFormat(a).format(x.gp),se=x.identity.telegram&&x.identity.x,oe=x.identity.wallet,yt=x.id.length>16?`${x.id.slice(0,8)}…${x.id.slice(-4)}`:x.id,vt=m=>m==="/identity"?se?{label:"VERIFIED",tone:"ready"}:{label:"PENDING",tone:"pending"}:m==="/mining"?H?{label:"SYNC",tone:"pending"}:_?{label:"LIVE",tone:"live"}:{label:"OFFLINE",tone:"offline"}:m==="/wallet"?oe?{label:"READY",tone:"ready"}:{label:"LOCKED",tone:"pending"}:null;return r.jsxs("header",{className:"bobu-header",children:[r.jsx("style",{children:`
        .bobu-header {
          position: fixed;
          top: 18px;
          left: 0;
          z-index: 1000;
          width: 100%;
          padding: 0 24px;
          pointer-events: none;
        }

        .bobu-nav {
          position: relative;
          display: grid;
          grid-template-columns: 175px minmax(0, 1fr) max-content;
          column-gap: 10px;
          align-items: center;
          width: min(1380px, 100%);
          min-height: 76px;
          margin: 0 auto;
          padding: 9px 14px 9px 11px;
          overflow: visible;
          border: 1px solid rgba(160, 136, 255, 0.16);
          border-radius: 25px;
          background:
            linear-gradient(
              110deg,
              rgba(18, 12, 48, 0.9),
              rgba(7, 13, 31, 0.94) 48%,
              rgba(5, 16, 29, 0.92)
            );
          box-shadow:
            0 18px 55px rgba(0, 0, 0, 0.34),
            0 0 36px rgba(106, 73, 255, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.045);
          backdrop-filter: blur(24px) saturate(145%);
          -webkit-backdrop-filter: blur(24px) saturate(145%);
          pointer-events: auto;
        }

        .bobu-nav::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          border-radius: inherit;
          pointer-events: none;
          background:
            radial-gradient(
              circle at 4% 35%,
              rgba(123, 83, 255, 0.18),
              transparent 23%
            ),
            linear-gradient(
              90deg,
              transparent,
              rgba(93, 205, 255, 0.035),
              transparent
            );
        }

        .bobu-brand {
          display: inline-flex;
          width: 175px;
          max-width: 175px;
          min-width: 0;
          align-items: center;
          justify-self: start;
          gap: 8px;
          overflow: hidden;
          color: white;
          text-decoration: none;
        }

        .bobu-brand-logo {
          position: relative;
          display: grid;
          flex: 0 0 58px;
          width: 58px;
          height: 58px;
          place-items: center;
          overflow: hidden;
          border: 1px solid rgba(100, 222, 255, 0.58);
          border-radius: 50%;
          background:
            radial-gradient(
              circle at 50% 38%,
              rgba(151, 91, 255, 0.48),
              rgba(14, 11, 41, 0.98) 70%
            );
          box-shadow:
            0 0 0 3px rgba(126, 78, 255, 0.1),
            0 0 20px rgba(86, 105, 255, 0.38),
            0 0 38px rgba(87, 218, 255, 0.12),
            inset 0 0 16px rgba(151, 91, 255, 0.2);
          transition:
            transform 220ms ease,
            border-color 220ms ease,
            box-shadow 220ms ease;
        }

        .bobu-brand:hover .bobu-brand-logo {
          transform: translateY(-1px) scale(1.045);
          border-color: rgba(120, 238, 255, 0.9);
          box-shadow:
            0 0 0 4px rgba(126, 78, 255, 0.12),
            0 0 26px rgba(95, 112, 255, 0.54),
            0 0 44px rgba(87, 218, 255, 0.2),
            inset 0 0 18px rgba(151, 91, 255, 0.25);
        }

        .bobu-brand-logo::before {
          content: "";
          position: absolute;
          inset: -1px;
          z-index: 3;
          border-radius: inherit;
          pointer-events: none;
          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.24),
              transparent 30%,
              transparent 66%,
              rgba(74, 224, 255, 0.14)
            );
        }

        .bobu-brand-logo::after {
          content: "";
          position: absolute;
          right: 5px;
          bottom: 5px;
          z-index: 4;
          width: 7px;
          height: 7px;
          border: 2px solid rgba(5, 14, 25, 0.95);
          border-radius: 50%;
          background: #25f89a;
          box-shadow: 0 0 10px rgba(37, 248, 154, 0.85);
        }

        .bobu-brand-logo img {
          display: block;
          width: 100%;
          height: 100%;
          border-radius: inherit;
          object-fit: cover;
          object-position: center 30%;
          transform: scale(1.08);
          filter:
            saturate(1.12)
            contrast(1.08)
            brightness(1.06)
            drop-shadow(0 0 10px rgba(91, 180, 255, 0.32));
          animation: bobuAvatarPulse 4.8s ease-in-out infinite;
        }

        .bobu-logo-fallback {
          position: relative;
          z-index: 2;
          font-size: 18px;
          font-weight: 950;
          letter-spacing: -0.04em;
          color: #ffffff;
          text-shadow:
            0 0 12px rgba(155, 104, 255, 0.9),
            0 0 26px rgba(88, 224, 255, 0.45);
        }

        .bobu-brand-copy {
          display: flex;
          width: 112px;
          min-width: 0;
          overflow: hidden;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          line-height: 1;
        }

        .bobu-brand-title {
          display: block;
          color: #ffffff;
          font-size: 21px;
          font-weight: 900;
          letter-spacing: 0.085em;
          line-height: 1;
          text-shadow: 0 0 18px rgba(255, 255, 255, 0.08);
        }

        .bobu-brand-universe {
          display: block;
          margin-top: 5px;
          color: rgba(231, 228, 255, 0.94);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.31em;
          line-height: 1;
        }

        .bobu-brand-tagline {
          display: block;
          margin-top: 7px;
          color: rgba(105, 221, 255, 0.78);
          font-size: 7px;
          font-weight: 800;
          letter-spacing: 0.22em;
          line-height: 1;
        }

        .bobu-nav-links {
          display: flex;
          min-width: 0;
          align-items: center;
          justify-content: center;
          justify-self: stretch;
          gap: 2px;
          padding: 4px;
          border: 1px solid rgba(160, 136, 255, 0.075);
          border-radius: 17px;
          background: rgba(8, 10, 27, 0.3);
        }

        .bobu-nav-link {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 43px;
          gap: 5px;
          padding: 0 9px;
          border: 1px solid transparent;
          border-radius: 13px;
          color: rgba(220, 221, 240, 0.72);
          font-size: 10.5px;
          font-weight: 650;
          white-space: nowrap;
          text-decoration: none;
          transition:
            color 180ms ease,
            background 180ms ease,
            border-color 180ms ease,
            transform 180ms ease,
            box-shadow 180ms ease;
        }

        .bobu-nav-link.bobu-nav-link--locked {
          opacity: 0.42;
          cursor: not-allowed;
          user-select: none;
          filter: saturate(0.55);
        }

        .bobu-nav-link.bobu-nav-link--locked:hover {
          color: inherit;
          background: transparent;
          transform: none;
          box-shadow: none;
        }

        .bobu-nav-link.bobu-nav-link--locked:hover svg {
          transform: none;
        }

        .bobu-nav-lock {
          width: 13px;
          height: 13px;
          margin-left: -3px;
          opacity: 1;
          color: #25F89A;
          filter: drop-shadow(0 0 6px rgba(37,248,154,.45));
        }

        .bobu-nav-link svg {
          flex-shrink: 0;
          opacity: 0.88;
          transition:
            transform 180ms ease,
            opacity 180ms ease;
        }

        .bobu-nav-link:hover {
          color: #ffffff;
          border-color: rgba(154, 125, 255, 0.14);
          background: rgba(117, 83, 255, 0.08);
          transform: translateY(-1px);
        }

        .bobu-nav-link:hover svg {
          opacity: 1;
          transform: scale(1.06);
        }

        .bobu-nav-link.active {
          color: #ffffff;
          border-color: rgba(151, 117, 255, 0.18);
          background:
            linear-gradient(
              135deg,
              rgba(119, 79, 255, 0.2),
              rgba(55, 89, 166, 0.12)
            );
          box-shadow:
            0 8px 20px rgba(0, 0, 0, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .bobu-account {
          display: flex;
          min-width: max-content;
          align-items: center;
          justify-self: end;
          margin-left: 4px;
          gap: 6px;
          flex-wrap: nowrap;
        }

        .bobu-language-control {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .bobu-language-control svg {
          flex: 0 0 auto;
          color: rgba(105, 221, 255, 0.88);
          width: 14px;
          height: 14px;
          pointer-events: none;
        }

        .bobu-language-select {
          appearance: none;
          border: none;
          background: transparent;
          color: inherit;
          font-weight: 700;
          text-align: center;
          text-align-last: center;
          min-width: 42px;
          padding: 0 18px 0 8px;
          cursor: pointer;
        }

        .bobu-language-select option {
          background: #0d1025;
          color: #ffffff;
        }

        .bobu-auth-loading {
          display: grid;
          min-width: 62px;
          height: 40px;
          place-items: center;
          color: rgba(255, 255, 255, 0.62);
        }

        .bobu-user {
          display: flex;
          max-width: 150px;
          align-items: center;
          gap: 8px;
          padding: 5px 9px 5px 5px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.025);
        }

        .bobu-avatar {
          display: grid;
          flex: 0 0 31px;
          align-self: center;
          width: 31px;
          height: 31px;
          place-items: center;
          border: 1px solid rgba(159, 121, 255, 0.25);
          border-radius: 50%;
          object-fit: cover;
          background: rgba(112, 72, 255, 0.15);
          color: white;
          font-size: 12px;
          font-weight: 800;
        }

        .bobu-user-avatar-only {
          min-width: 43px;
          max-width: 43px;
          width: 43px;
          height: 43px;
          padding: 5px;
          justify-content: center;
          border-radius: 50%;
        }

        .bobu-user-avatar-only .bobu-avatar {
          width: 31px;
          height: 31px;
        }

        .bobu-user-name {
          display: block;
          min-width: 0;
          overflow: hidden;
          color: rgba(242, 241, 255, 0.82);
          font-size: 11px;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .bobu-gp-badge {
          display: inline-flex;
          flex: 0 0 auto;
          min-height: 41px;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 12px;
          border: 1px solid rgba(255, 208, 92, 0.22);
          border-radius: 13px;
          background:
            linear-gradient(
              135deg,
              rgba(113, 77, 18, 0.28),
              rgba(58, 38, 10, 0.2)
            );
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            0 10px 22px rgba(0, 0, 0, 0.16);
          color: #ffe18a;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .bobu-gp-badge strong {
          color: #ffffff;
          font-size: 12px;
        }

        .bobu-auth-button {
          display: inline-flex;
          flex: 0 0 auto;
          min-height: 43px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 15px;
          border: 1px solid rgba(142, 116, 255, 0.28);
          border-radius: 13px;
          background:
            linear-gradient(
              135deg,
              rgba(88, 69, 172, 0.25),
              rgba(38, 51, 96, 0.22)
            );
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            0 10px 24px rgba(0, 0, 0, 0.16);
          color: #ffffff;
          font: inherit;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            box-shadow 180ms ease,
            background 180ms ease;
        }

        .bobu-auth-button:hover {
          transform: translateY(-1px);
          border-color: rgba(112, 213, 255, 0.48);
          background:
            linear-gradient(
              135deg,
              rgba(101, 75, 202, 0.35),
              rgba(41, 81, 133, 0.3)
            );
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.07),
            0 11px 26px rgba(0, 0, 0, 0.2),
            0 0 18px rgba(100, 86, 255, 0.11);
        }

        .bobu-logout-button {
          padding: 0 12px;
        }

        .bobu-cycle {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 0 3px;
          color: rgba(225, 227, 243, 0.7);
          font-size: 9px;
          font-style: normal;
          font-weight: 700;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }

        .bobu-cycle-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #27f39b;
          box-shadow:
            0 0 7px rgba(39, 243, 155, 0.85),
            0 0 15px rgba(39, 243, 155, 0.32);
        }

        .bobu-mobile-button {
          display: none;
          width: 43px;
          height: 43px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(147, 119, 255, 0.2);
          border-radius: 13px;
          background: rgba(106, 75, 189, 0.14);
          color: white;
          cursor: pointer;
        }

        .bobu-mobile-panel {
          display: none;
        }

        @media (max-width: 1080px) {
          .bobu-nav {
            grid-template-columns: minmax(190px, 1fr) auto minmax(170px, 1fr);
          }

          .bobu-nav-link {
            padding: 0 11px;
          }

          .bobu-user {
            display: none;
          }

          .bobu-cycle {
            display: none;
          }
        }

        @keyframes bobuAvatarPulse {
          0%,
          100% {
            transform: scale(1.08);
            filter:
              saturate(1.12)
              contrast(1.08)
              brightness(1.06)
              drop-shadow(
                0 0 9px rgba(91, 180, 255, 0.28)
              );
          }

          50% {
            transform: scale(1.115);
            filter:
              saturate(1.18)
              contrast(1.1)
              brightness(1.1)
              drop-shadow(
                0 0 15px rgba(127, 92, 255, 0.44)
              );
          }
        }

        @media (max-width: 860px) {
          .bobu-header {
            top: 12px;
            padding: 0 14px;
          }

          .bobu-nav {
            display: flex;
            min-height: 70px;
            align-items: center;
            justify-content: space-between;
            padding: 7px 9px;
            border-radius: 22px;
          }

          .bobu-nav-links,
          .bobu-account {
            display: none;
          }

          .bobu-brand-logo {
            flex-basis: 56px;
            width: 56px;
            height: 56px;
          }

          .bobu-brand-title {
            font-size: 18px;
          }

          .bobu-brand-universe {
            font-size: 8px;
          }

          .bobu-brand-tagline {
            font-size: 6px;
          }

          .bobu-mobile-button {
            display: inline-flex;
          }

          .bobu-mobile-panel {
            position: absolute;
            top: calc(100% + 10px);
            right: 0;
            left: 0;
            display: flex;
            flex-direction: column;
            gap: 9px;
            padding: 13px;
            border: 1px solid rgba(155, 125, 255, 0.18);
            border-radius: 20px;
            background:
              linear-gradient(
                145deg,
                rgba(17, 12, 45, 0.97),
                rgba(5, 15, 29, 0.98)
              );
            box-shadow:
              0 24px 55px rgba(0, 0, 0, 0.45),
              0 0 32px rgba(106, 73, 255, 0.1);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            opacity: 0;
            visibility: hidden;
            transform: translateY(-8px) scale(0.98);
            transform-origin: top center;
            transition:
              opacity 180ms ease,
              visibility 180ms ease,
              transform 180ms ease;
          }

          .bobu-mobile-panel.open {
            opacity: 1;
            visibility: visible;
            transform: translateY(0) scale(1);
          }

          .bobu-mobile-links {
            display: grid;
            gap: 5px;
          }

          .bobu-mobile-links .bobu-nav-link {
            justify-content: flex-start;
            min-height: 47px;
            padding: 0 14px;
          }

          .bobu-mobile-account {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            padding-top: 10px;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
          }

          .bobu-mobile-account .bobu-user {
            display: flex;
            max-width: 180px;
          }

          .bobu-mobile-account .bobu-cycle {
            display: inline-flex;
          }
        }

        @media (max-width: 520px) {
          .bobu-header {
            padding: 0 9px;
          }

          .bobu-nav {
            min-height: 64px;
            border-radius: 19px;
          }

          .bobu-brand {
            gap: 10px;
          }

          .bobu-brand-logo {
            flex-basis: 52px;
            width: 52px;
            height: 52px;
          }

          .bobu-brand-copy {
            min-width: 106px;
          }

          .bobu-brand-title {
            font-size: 16px;
          }

          .bobu-brand-universe {
            margin-top: 4px;
            font-size: 7px;
          }

          .bobu-brand-tagline {
            margin-top: 5px;
            font-size: 5px;
          }

          .bobu-mobile-button {
            width: 41px;
            height: 41px;
          }

          .bobu-mobile-account {
            align-items: stretch;
            flex-direction: column;
          }

          .bobu-mobile-account .bobu-user {
            width: 100%;
            max-width: none;
          }

          .bobu-mobile-account .bobu-gp-badge,
          .bobu-mobile-account .bobu-auth-button,
          .bobu-mobile-account .bobu-language-control {
            width: 100%;
          }

          .bobu-mobile-account .bobu-language-select {
            width: 100%;
          }

          .bobu-mobile-account .bobu-cycle {
            justify-content: center;
            min-height: 28px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .bobu-brand-logo,
          .bobu-brand-logo img,
          .bobu-nav-link,
          .bobu-auth-button,
          .bobu-mobile-panel {
            transition: none;
            animation: none;
          }
        }
      `}),r.jsxs("nav",{className:"bobu-nav","aria-label":s("nav.mainNavigation"),children:[r.jsxs(de,{to:"/",className:"bobu-brand","aria-label":s("nav.home"),onClick:V,children:[r.jsx("span",{className:"bobu-brand-logo",children:y?r.jsx("img",{src:b,alt:"",onError:ne}):r.jsx("span",{className:"bobu-logo-fallback",children:"B"})}),r.jsxs("span",{className:"bobu-brand-copy",children:[r.jsx("strong",{className:"bobu-brand-title",children:"BOBU"}),r.jsx("span",{className:"bobu-brand-universe",children:"UNIVERSE"}),r.jsx("span",{className:"bobu-brand-tagline",children:"BUILDING SPACE"})]})]}),r.jsx("div",{className:"bobu-nav-links",children:Ue.map(({to:m,labelKey:C,icon:k,locked:le})=>le?r.jsxs("span",{className:"bobu-nav-link bobu-nav-link--locked",title:s("nav.walletUnderDevelopment"),"aria-label":s("nav.lockedUnderDevelopment",{label:s(C)}),"aria-disabled":"true",children:[r.jsx(k,{size:16,strokeWidth:1.8}),r.jsx("span",{children:s(C)}),r.jsx(Ce,{className:"bobu-nav-lock",strokeWidth:2,"aria-hidden":"true"})]},m):r.jsxs(de,{to:m,end:m==="/",className:({isActive:F})=>`bobu-nav-link${F?" active":""}`,children:[r.jsx(k,{size:16,strokeWidth:1.8}),r.jsx("span",{children:s(C)})]},m))}),r.jsxs("div",{className:"bobu-account",children:[r.jsxs("label",{className:"bobu-language-control","aria-label":s("language.selectorLabel"),children:[r.jsx(je,{size:15,"aria-hidden":"true"}),r.jsx("select",{className:"bobu-language-select",value:a,"aria-label":s("language.selectorLabel"),onChange:m=>n(m.target.value),children:i.map(m=>r.jsx("option",{value:m.code,children:m.code.toUpperCase()},m.code))})]}),t?r.jsx("span",{className:"bobu-auth-loading",children:"•••"}):S?r.jsxs(r.Fragment,{children:[r.jsxs("button",{type:"button",className:"bobu-auth-button bobu-logout-button",onClick:P,children:[r.jsx(Le,{size:15}),r.jsx("span",{children:s("auth.logout")})]}),r.jsxs("span",{className:"bobu-cycle",children:[r.jsx("i",{className:"bobu-cycle-dot"}),s("common.cycle")," 000001"]}),r.jsx("div",{className:"bobu-user bobu-user-avatar-only",title:j,"aria-label":j,children:J?r.jsx("img",{src:J,alt:j,className:"bobu-avatar",referrerPolicy:"no-referrer"}):r.jsx("span",{className:"bobu-avatar",children:j.charAt(0).toUpperCase()})})]}):r.jsxs("button",{type:"button",className:"bobu-auth-button",onClick:z,children:[r.jsx(Re,{size:16}),r.jsx("span",{children:s("auth.login")})]}),!S&&r.jsxs("span",{className:"bobu-cycle",children:[r.jsx("i",{className:"bobu-cycle-dot"}),s("common.cycle")," 000001"]})]}),r.jsx("button",{type:"button",className:"bobu-mobile-button","aria-label":s(o?"nav.closeMobileMenu":"nav.openMobileMenu"),"aria-expanded":o,onClick:()=>l(m=>!m),children:o?r.jsx(we,{size:20}):r.jsx(Rt,{size:20})}),r.jsxs("div",{className:`bobu-mobile-panel${o?" open":""}`,children:[S&&r.jsxs("section",{className:"bobu-mobile-builder-card",children:[r.jsxs("div",{className:"bobu-mobile-builder-head",children:[r.jsx("div",{className:"bobu-mobile-builder-avatar",children:J?r.jsx("img",{src:J,alt:j,referrerPolicy:"no-referrer"}):r.jsx("span",{children:j.charAt(0).toUpperCase()})}),r.jsxs("div",{className:"bobu-mobile-builder-copy",children:[r.jsx("small",{children:"BOBU BUILDER"}),r.jsx("strong",{children:j}),r.jsx("span",{children:yt})]}),r.jsxs("div",{className:"bobu-mobile-builder-gp",children:[r.jsx("small",{children:"GP"}),r.jsx("strong",{children:ft})]})]}),r.jsxs("div",{className:"bobu-mobile-builder-meta",children:[r.jsxs("span",{children:["Personal GP",r.jsx("strong",{children:new Intl.NumberFormat(a).format(x.personalGp)})]}),r.jsxs("span",{children:["Network GP",r.jsx("strong",{children:new Intl.NumberFormat(a).format(x.eligibleNetworkGp)})]}),r.jsxs("span",{children:["Referrals",r.jsx("strong",{children:x.referralCount})]})]}),r.jsxs("div",{className:"bobu-mobile-builder-statuses",children:[r.jsxs("span",{className:_?"is-live":"is-offline",children:[r.jsx("i",{}),"Mining"," ",H?"Sync":_?"Live":"Offline"]}),r.jsxs("span",{className:oe?"is-ready":"is-pending",children:[r.jsx("i",{}),"Wallet"," ",oe?"Ready":"Locked"]}),r.jsxs("span",{className:se?"is-ready":"is-pending",children:[r.jsx("i",{}),"Genesis"," ",se?"Verified":"Pending"]})]})]}),r.jsx("div",{className:"bobu-mobile-links",children:Ue.map(({to:m,labelKey:C,icon:k,locked:le})=>{const F=vt(m);return le?r.jsxs("span",{className:"bobu-nav-link bobu-nav-link--locked",title:s("nav.walletUnderDevelopment"),"aria-label":s("nav.lockedUnderDevelopment",{label:s(C)}),"aria-disabled":"true",children:[r.jsx(k,{size:18,strokeWidth:1.8}),r.jsx("span",{children:s(C)}),r.jsx(Ce,{className:"bobu-nav-lock",strokeWidth:2,"aria-hidden":"true"})]},m):r.jsxs(de,{to:m,end:m==="/",className:({isActive:wt})=>`bobu-nav-link${wt?" active":""}`,onClick:V,children:[r.jsx("span",{className:"bobu-mobile-link-icon",children:r.jsx(k,{size:18,strokeWidth:1.8})}),r.jsx("span",{className:"bobu-mobile-link-label",children:s(C)}),F&&r.jsx("span",{className:`bobu-mobile-link-status is-${F.tone}`,children:F.label})]},m)})}),r.jsxs("button",{type:"button",className:"bobu-mobile-ai-card",onClick:N,children:[r.jsxs("span",{className:"bobu-mobile-ai-icon",children:[r.jsx(tt,{size:21}),r.jsx(rt,{size:12})]}),r.jsxs("span",{className:"bobu-mobile-ai-copy",children:[r.jsx("strong",{children:"BOBU AI"}),r.jsx("small",{children:"Ask about GP, Mining, Wallet and your Builder journey"})]}),r.jsx(Tt,{size:19})]}),r.jsxs("div",{className:"bobu-mobile-account",children:[r.jsxs("label",{className:"bobu-language-control","aria-label":s("language.selectorLabel"),children:[r.jsx(je,{size:16,"aria-hidden":"true"}),r.jsx("select",{className:"bobu-language-select",value:a,"aria-label":s("language.selectorLabel"),onChange:m=>n(m.target.value),children:i.map(m=>r.jsx("option",{value:m.code,children:m.nativeLabel},m.code))})]}),t?r.jsx("span",{className:"bobu-auth-loading",children:"•••"}):S?r.jsxs("button",{type:"button",className:"bobu-auth-button",onClick:P,children:[r.jsx(Le,{size:15}),r.jsx("span",{children:s("auth.logout")})]}):r.jsxs("button",{type:"button",className:"bobu-auth-button",onClick:z,children:[r.jsx(Re,{size:16}),r.jsx("span",{children:s("auth.login")})]}),r.jsxs("span",{className:"bobu-cycle",children:[r.jsx("i",{className:"bobu-cycle-dot"}),s("common.cycle")," 000001"]})]})]})]}),c&&r.jsx(d.Suspense,{fallback:null,children:r.jsx(ir,{open:!0,onClose:()=>u(!1)})})]})}function U(e){const t=Math.sin(e*12.9898)*43758.5453;return t-Math.floor(t)}const or=Array.from({length:170},(e,t)=>({left:U(t+11)*100,top:U(t+101)*100,size:.8+U(t+211)*2.2,delay:U(t+307)*7,duration:2.6+U(t+401)*5.4,opacity:.3+U(t+503)*.7}));function lr(){return r.jsxs("div",{className:"stars","aria-hidden":"true",style:{pointerEvents:"none"},children:[r.jsx("div",{className:"nebula nebula-one"}),r.jsx("div",{className:"nebula nebula-two"}),or.map((e,t)=>{const a={left:`${e.left}%`,top:`${e.top}%`,width:`${e.size}px`,height:`${e.size}px`,opacity:e.opacity,animationDelay:`${e.delay}s`,animationDuration:`${e.duration}s`};return r.jsx("i",{style:a},t)}),r.jsx("span",{className:"shooting shooting-one"}),r.jsx("span",{className:"shooting shooting-two"}),r.jsx("span",{className:"shooting shooting-three"})]})}class W extends Error{constructor(a){super(a);w(this,"code");this.name="BobuAIServiceError",this.code=a}}const dr={async ask({messages:e,language:t,pathname:a}){const{data:{session:i},error:n}=await g.auth.getSession();if(n)throw console.error("BOBU AI session load failed:",n.message),new W("session_failed");if(!(i!=null&&i.access_token))throw new W("sign_in_required");const s=e.slice(-12).map(c=>({role:c.role,content:c.content.trim()})).filter(c=>c.content.length>0),{data:o,error:l}=await g.functions.invoke("bobu-ai",{body:{messages:s,language:t,pathname:a},headers:{Authorization:`Bearer ${i.access_token}`}});if(l)throw console.error("BOBU AI function invocation failed:",l.message),new W("request_failed");if(!(o!=null&&o.ok)||!o.message)throw console.error("BOBU AI response unavailable:",(o==null?void 0:o.error)??"Unknown response error"),new W("response_unavailable");return o.message}},cr=()=>typeof globalThis.crypto<"u"&&typeof globalThis.crypto.randomUUID=="function"?globalThis.crypto.randomUUID():[Date.now().toString(36),Math.random().toString(36).slice(2),Math.random().toString(36).slice(2)].join("-"),ue=(e,t)=>({id:cr(),role:e,content:t,createdAt:new Date().toISOString()});function ur(){const{session:e}=D(),{language:t,direction:a,t:i}=ie(),[n,s]=d.useState(!1),[o,l]=d.useState(""),[c,u]=d.useState(!1),[b,h]=d.useState(null),y=d.useMemo(()=>ue("assistant",i("ai.welcome")),[t,i]),[B,_]=d.useState([y]),T=d.useRef(null);d.useEffect(()=>{var f;(f=T.current)==null||f.scrollIntoView({behavior:"smooth"})},[B,c]),d.useEffect(()=>{const f=()=>{s(!0)};return window.addEventListener("bobu-ai:open",f),()=>{window.removeEventListener("bobu-ai:open",f)}},[]),d.useEffect(()=>{_(f=>f.length>1?f:[y])},[y]);const H=async f=>{f.preventDefault();const x=o.trim();if(!x||c)return;if(!e){h(i("ai.signInRequired"));return}if(x.length>1200){h(i("ai.messageTooLong"));return}const ne=ue("user",x),z=[...B,ne];_(z),l(""),u(!0),h(null);try{const P=z.filter(N=>N!==y).map(N=>({role:N.role,content:N.content})),V=await dr.ask({messages:P,language:t,pathname:window.location.pathname});_(N=>[...N,ue("assistant",V)])}catch(P){P instanceof W?h(i({session_failed:"ai.sessionFailed",sign_in_required:"ai.signInRequired",request_failed:"ai.requestFailed",response_unavailable:"ai.responseUnavailable"}[P.code])):(console.error("Unexpected BOBU AI error:",P),h(i("ai.requestFailed")))}finally{u(!1)}};return r.jsxs("div",{className:"bobu-ai",dir:a,children:[n&&r.jsxs("aside",{className:"bobu-ai-panel","aria-label":i("ai.aria"),children:[r.jsxs("header",{className:"bobu-ai-header",children:[r.jsxs("div",{className:"bobu-ai-identity",children:[r.jsx("div",{className:"bobu-ai-avatar",children:r.jsx(tt,{size:21})}),r.jsxs("div",{children:[r.jsx("span",{children:i("ai.name")}),r.jsx("strong",{children:i("ai.subtitle")})]})]}),r.jsx("button",{type:"button",className:"bobu-ai-close","aria-label":i("ai.closeLabel"),onClick:()=>s(!1),children:r.jsx(we,{size:18})})]}),r.jsxs("div",{className:"bobu-ai-status",children:[r.jsx("i",{}),r.jsx("span",{children:i("ai.online")})]}),r.jsxs("div",{className:"bobu-ai-messages",children:[B.map(f=>r.jsxs("article",{className:f.role==="user"?"bobu-ai-message is-user":"bobu-ai-message is-assistant",children:[r.jsx("span",{children:f.role==="user"?i("ai.builderLabel"):i("ai.name")}),r.jsx("p",{children:f.content})]},f.id)),c&&r.jsxs("article",{className:"bobu-ai-message is-assistant",children:[r.jsx("span",{children:i("ai.name")}),r.jsxs("div",{className:"bobu-ai-typing",children:[r.jsx(Ot,{size:16,className:"bobu-ai-spinner"}),r.jsx("p",{children:i("ai.analyzing")})]})]}),r.jsx("div",{ref:T})]}),b&&r.jsx("div",{className:"bobu-ai-error",children:b}),r.jsxs("form",{className:"bobu-ai-composer",onSubmit:H,children:[r.jsx("textarea",{value:o,maxLength:1200,rows:1,disabled:c,placeholder:i("ai.placeholder"),onChange:f=>l(f.target.value),onKeyDown:f=>{var x;f.key==="Enter"&&!f.shiftKey&&(f.preventDefault(),(x=f.currentTarget.form)==null||x.requestSubmit())}}),r.jsx("button",{type:"submit",disabled:c||o.trim().length===0,"aria-label":i("ai.sendLabel"),children:r.jsx(Gt,{size:17})})]})]}),r.jsx("button",{type:"button",className:"bobu-ai-trigger","aria-label":i(n?"ai.closeLabel":"ai.openLabel"),"aria-expanded":n,onClick:()=>s(f=>!f),children:n?r.jsx(we,{size:21}):r.jsxs(r.Fragment,{children:[r.jsx(Ut,{size:21}),r.jsx(rt,{size:13,className:"bobu-ai-spark"})]})})]})}function mr(){return r.jsxs("div",{className:"app",children:[r.jsx(lr,{}),r.jsx(sr,{}),r.jsx("main",{children:r.jsx(ve,{})}),r.jsx(ur,{})]})}const pr=["system","light","dark"],gr=["system","full","reduced"],hr=e=>st.includes(e),br=e=>pr.includes(e),fr=e=>gr.includes(e),De={toPreferences(e,t){return{preferredLanguage:hr(e.preferred_language)?e.preferred_language:t.preferredLanguage,themePreference:br(e.theme_preference)?e.theme_preference:t.themePreference,motionPreference:fr(e.motion_preference)?e.motion_preference:t.motionPreference,languageSetupCompleted:typeof e.language_setup_completed=="boolean"?e.language_setup_completed:t.languageSetupCompleted,languageConfirmedAt:typeof e.language_confirmed_at=="string"?e.language_confirmed_at:null}}},yr=`
  builder_id,
  preferred_language,
  theme_preference,
  motion_preference,
  language_setup_completed,
  language_confirmed_at,
  created_at,
  updated_at
`,ze={async load(e){const{data:t,error:a}=await g.from("builder_preferences").select(yr).eq("builder_id",e).maybeSingle();if(a)throw new Error(`Builder preferences could not be loaded: ${a.message}`);return t},async updateMine(e){const{data:t,error:a}=await g.rpc("update_my_builder_preferences",{p_preferred_language:e.preferredLanguage??null,p_theme_preference:e.themePreference??null,p_motion_preference:e.motionPreference??null,p_language_setup_completed:e.languageSetupCompleted??null});if(a)throw new Error(`Builder preferences could not be saved: ${a.message}`);const i=Array.isArray(t)?t[0]:t;if(!i)throw new Error("Builder preferences update returned no data.");return i}},Ve=()=>({preferredLanguage:I.resolveInitialLanguage(),themePreference:"system",motionPreference:"system",languageSetupCompleted:!1,languageConfirmedAt:null}),Fe={async restore(e){E.setRestoring(!0);try{const t=await ze.load(e);if(!t){const i=Ve();return E.restore(i),i}const a=De.toPreferences(t,Ve());return I.storeLanguage(a.preferredLanguage),E.restore(a),a}catch(t){throw E.setError(t),t}},async update(e){const t=E.getSnapshot().preferences;E.updateLocal(e),E.setSaving(!0);try{const a=await ze.updateMine(e),i=De.toPreferences(a,t);return I.storeLanguage(i.preferredLanguage),E.restore(i),i}catch(a){throw E.updateLocal(t),E.setError(a),a}},reset(){E.reset()}};function vr(){return d.useSyncExternalStore(E.subscribe,E.getSnapshot,E.getSnapshot)}function wr(){const e=Se(),{authenticated:t,loading:a}=D(),i=vr(),{t:n}=ie();if(a)return r.jsx("div",{className:"language-setup-state",children:n("app.loading")});if(!t)return r.jsx(ve,{});if(i.source!=="server"&&!i.lastError)return r.jsx("div",{className:"language-setup-state",children:n("app.loading")});if(i.source!=="server"&&i.lastError)return r.jsxs("main",{className:"language-setup-state language-setup-error",children:[r.jsx("p",{children:n("onboarding.language.restoreError")}),r.jsx("button",{type:"button",onClick:()=>window.location.reload(),children:n("onboarding.language.retry")})]});const s=i.preferences.languageSetupCompleted;return!s&&e.pathname!=="/language-setup"?r.jsx(Y,{to:"/language-setup",replace:!0,state:{from:e.pathname}}):s&&e.pathname==="/language-setup"?r.jsx(Y,{to:"/",replace:!0}):r.jsx(ve,{})}const xr={async getMyAccess(){const{data:e,error:t}=await g.rpc("get_my_admin_access");if(t)throw new Error(`Unable to verify admin access: ${t.message}`);const i=(e??[])[0];return i?{userId:i.user_id,role:i.role,active:i.active}:null}};function Er(){const{session:e,loading:t}=D(),[a,i]=d.useState(null),[n,s]=d.useState(!0),[o,l]=d.useState(null);return d.useEffect(()=>{let c=!0;return t?()=>{c=!1}:e!=null&&e.user.id?(s(!0),l(null),xr.getMyAccess().then(u=>{c&&i(u)}).catch(u=>{if(!c)return;const b=u instanceof Error?u.message:"Unable to verify admin access.";i(null),l(b)}).finally(()=>{c&&s(!1)}),()=>{c=!1}):(i(null),l(null),s(!1),()=>{c=!1})},[t,e==null?void 0:e.user.id]),{access:a,loading:t||n,error:o,hasAccess:!!(a!=null&&a.active)}}function L({children:e}){const t=Se(),{authenticated:a,loading:i}=D(),{loading:n,error:s,hasAccess:o}=Er();return i||n?r.jsx("main",{className:"admin-route-state",children:r.jsxs("div",{className:"admin-route-state__panel",children:[r.jsx("span",{className:"admin-route-state__signal"}),r.jsx("p",{children:"Verifying command authority…"})]})}):a?s||!o?r.jsx("main",{className:"admin-route-state",children:r.jsxs("div",{className:"admin-route-state__panel",children:[r.jsx("span",{className:"admin-route-state__eyebrow",children:"BOBU SECURITY"}),r.jsx("h1",{children:"Access denied"}),r.jsx("p",{children:"This account does not have permission to access the BOBU Control Center."}),s?r.jsx("small",{children:s}):null,r.jsx("a",{href:"/admin/login",children:"Return to secure login"})]})}):r.jsx(r.Fragment,{children:e}):r.jsx(Y,{to:"/admin/login",replace:!0,state:{from:t.pathname+t.search}})}const ke="bobu.pending-builder-invite-code",Sr=/^BOBU-[A-F0-9]{6}$/,Br=e=>e.trim().toUpperCase(),_r=e=>{const t=Br(e);return Sr.test(t)?(sessionStorage.setItem(ke,t),!0):!1},kr=()=>sessionStorage.getItem(ke),Ar=()=>{sessionStorage.removeItem(ke)},Ir=async()=>{const e=kr();if(!e)return null;const{data:t,error:a}=await g.rpc("attribute_builder_invite",{p_invite_code:e});if(a)throw a;const i=Array.isArray(t)?t[0]:t;return i&&Ar(),i},ee=e=>{const t=Number(e??0);return!Number.isFinite(t)||t<0?0:t},Pr=new Set(["telegram","x","instagram","wallet"]),Nr=e=>({...ae(),id:e}),mt=e=>{const t={telegram:!1,x:!1,instagram:!1,wallet:!1};return e.forEach(a=>{const i=a.provider.toLowerCase();Pr.has(i)&&(t[i]=a.verified)}),t},Cr=(e,t)=>{const a=ae();return{...a,id:e.builder_id,username:e.display_name??e.username??a.username,level:e.level,personalGp:ee(e.personal_gp),pendingNetworkGp:ee(e.pending_network_gp),eligibleNetworkGp:ee(e.eligible_network_gp),gp:ee(e.gp),reputation:e.reputation,inviteCode:e.invite_code??a.inviteCode,referralCount:e.referral_count,identity:mt(t)}},jr={toSnapshot(e){return e.profile===null?{...Nr(e.builderId),identity:mt(e.identities)}:Cr(e.profile,e.identities)}},Lr={async load(e){if(e.trim().length===0)throw new Error("Builder ID is required.");const{data:t,error:a}=await g.from("builder_profiles").select("*").eq("builder_id",e).maybeSingle();if(a)throw a;const{data:i,error:n}=await g.from("builder_social_identities").select("*").eq("builder_id",e).returns();if(n)throw n;return{builderId:e,profile:t,identities:i??[]}}},Rr=async e=>{const{data:{session:t}}=await g.auth.getSession(),a=e??(t==null?void 0:t.user.id);if(!a||e&&(t==null?void 0:t.user.id)!==e)return null;const i=await Lr.load(a),n=jr.toSnapshot(i),{data:{session:s}}=await g.auth.getSession();return(s==null?void 0:s.user.id)!==a?null:(R.restore(n),i)};function Tr(){const{inviteCode:e}=St();return d.useEffect(()=>{e&&_r(e)},[e]),r.jsx(Y,{to:"/genesis",replace:!0})}const Or=d.lazy(()=>p(()=>import("./Genesis-DfiIvB02.js"),__vite__mapDeps([7,1,2,5,3,4])).then(e=>({default:e.Genesis}))),Gr=d.lazy(()=>p(()=>import("./Home-CuigXnoL.js"),__vite__mapDeps([8,1,2,5,3,4,9])).then(e=>({default:e.Home}))),Ur=d.lazy(()=>p(()=>import("./Missions-DOaChSZx.js"),__vite__mapDeps([10,1,2,3,5,4])).then(e=>({default:e.Missions}))),Mr=d.lazy(()=>p(()=>import("./Galaxy-BE7YS2Zk.js"),__vite__mapDeps([11,1,2,12,5,3,4])).then(e=>({default:e.Galaxy}))),Dr=d.lazy(()=>p(()=>import("./BuilderPassport-CPdcbrg-.js"),__vite__mapDeps([13,1,2,3,14,4,5,15])).then(e=>({default:e.BuilderPassport}))),zr=d.lazy(()=>p(()=>import("./BuilderMining-ILvOREXK.js"),__vite__mapDeps([16,1,2,3,12,4,5,17]))),Vr=d.lazy(()=>p(()=>import("./BuilderIdentity-CyK7pN45.js"),__vite__mapDeps([18,1,2,4,3,5,19]))),Fr=d.lazy(()=>p(()=>import("./BuilderWallet-sFf0xoer.js"),__vite__mapDeps([20,1,2,3,4,5,21]))),Wr=d.lazy(()=>p(()=>import("./Leaderboard-BKmeJCtq.js"),__vite__mapDeps([22,1,2,3,4,5]))),qr=d.lazy(()=>p(()=>import("./AdminDashboard-DMtUngOq.js"),__vite__mapDeps([23,1,2,24,3,25,4,5,26]))),$r=d.lazy(()=>p(()=>import("./AdminBuilders-DXVO0tkH.js"),__vite__mapDeps([27,1,2,25,3,4,5,26]))),Yr=d.lazy(()=>p(()=>import("./AdminRewardLedger-D523RIS9.js"),__vite__mapDeps([28,1,2,25,3,4,5,26]))),Kr=d.lazy(()=>p(()=>import("./AdminMiningSessions-BKXjqWeP.js"),__vite__mapDeps([29,1,2,25,3,4,5,26]))),Hr=d.lazy(()=>p(()=>import("./AdminSecurityCenter-CjegzjBN.js"),__vite__mapDeps([30,1,2,25,3,4,5,26]))),Jr=d.lazy(()=>p(()=>import("./AdminAuditLogs-D-ESLnLD.js"),__vite__mapDeps([31,1,2,25,3,4,5,26]))),Xr=d.lazy(()=>p(()=>import("./AdminAnalytics-DRwcCo4e.js"),__vite__mapDeps([32,1,2,24,3,25,4,5,26]))),Qr=d.lazy(()=>p(()=>import("./AdminLogin-Cwv5Hrxg.js"),__vite__mapDeps([33,1,2,3,4,5,26]))),Zr=d.lazy(()=>p(()=>import("./LanguageSetup-RjbgSsmk.js"),__vite__mapDeps([34,1,2,3,4,5,35]))),ea=d.lazy(()=>p(()=>import("./PrivacyPolicy-Didk0pPR.js"),__vite__mapDeps([36,1,2,37]))),ta=d.lazy(()=>p(()=>import("./TermsOfService-BvoSBOf3.js"),__vite__mapDeps([38,1,2,37])));function ra(){const e=Se(),{t}=ie();return r.jsx(Mt,{mode:"wait",children:r.jsx(d.Suspense,{fallback:r.jsx("div",{style:{minHeight:"100vh",display:"grid",placeItems:"center",color:"rgba(235, 238, 255, 0.72)"},children:t("app.loading")}),children:r.jsxs(Bt,{location:e,children:[r.jsx(v,{path:"/join/:inviteCode",element:r.jsx(Tr,{})}),r.jsx(v,{path:"/genesis",element:r.jsx(Or,{})}),r.jsxs(v,{element:r.jsx(wr,{}),children:[r.jsx(v,{path:"/language-setup",element:r.jsx(Zr,{})}),r.jsxs(v,{element:r.jsx(mr,{}),children:[r.jsx(v,{path:"/privacy",element:r.jsx(ea,{})}),r.jsx(v,{path:"/terms",element:r.jsx(ta,{})}),r.jsx(v,{path:"/",element:r.jsx(Gr,{})}),r.jsx(v,{path:"/identity",element:r.jsx(Vr,{})}),r.jsx(v,{path:"/passport",element:r.jsx(Dr,{})}),r.jsx(v,{path:"/wallet",element:r.jsx(Fr,{})}),r.jsx(v,{path:"/mining",element:r.jsx(zr,{})}),r.jsx(v,{path:"/missions",element:r.jsx(Ur,{})}),r.jsx(v,{path:"/galaxy",element:r.jsx(Mr,{})}),r.jsx(v,{path:"/leaderboard",element:r.jsx(Wr,{})})]})]}),r.jsx(v,{path:"/admin/login",element:r.jsx(Qr,{})}),r.jsx(v,{path:"/admin",element:r.jsx(L,{children:r.jsx(qr,{})})}),r.jsx(v,{path:"/admin/builders",element:r.jsx(L,{children:r.jsx($r,{})})}),r.jsx(v,{path:"/admin/reward-ledger",element:r.jsx(L,{children:r.jsx(Yr,{})})}),r.jsx(v,{path:"/admin/mining-sessions",element:r.jsx(L,{children:r.jsx(Kr,{})})}),r.jsx(v,{path:"/admin/security",element:r.jsx(L,{children:r.jsx(Hr,{})})}),r.jsx(v,{path:"/admin/audit-logs",element:r.jsx(L,{children:r.jsx(Jr,{})})}),r.jsx(v,{path:"/admin/analytics",element:r.jsx(L,{children:r.jsx(Xr,{})})}),r.jsx(v,{path:"*",element:r.jsx(Y,{to:"/genesis",replace:!0})})]},e.pathname)})})}const aa=["locked","available","active","completed","claimed","expired"],ia=["locked","unlocked","claimed"],We=50,pt=(e,t,a)=>{if(a.gp!==void 0&&(!Number.isInteger(a.gp)||a.gp<We))throw new Error(`${e} "${t}" must award at least ${We} GP when a GP reward is defined.`)},na=e=>(e.forEach(t=>{pt("Mission",t.id,t.reward)}),e),sa=e=>(e.forEach(t=>{pt("Achievement",t.id,t.reward)}),e),oa=na([{id:"start-mining",title:"Start Mining",description:"Start one mining session.",cadence:"daily",target:1,eventType:"MINING_STARTED",reward:{gp:50}}]),la=sa([{id:"first-mining-session",title:"First Mining Session",description:"Start your first mining session.",eventType:"MINING_STARTED",target:1,reward:{gp:100}}]);class da{constructor(){w(this,"definitions",oa.map(t=>({...t,reward:{...t.reward}})));w(this,"progressByBuilder",new Map);w(this,"listeners",new Set);w(this,"version",0)}emitChange(){this.version+=1,this.listeners.forEach(t=>{t()})}subscribe(t){return this.listeners.add(t),()=>{this.listeners.delete(t)}}getVersion(){return this.version}getDefinitions(){return this.definitions.map(t=>({...t,reward:{...t.reward}}))}getDefinitionsByEventType(t){return this.definitions.filter(a=>a.eventType===t).map(a=>({...a,reward:{...a.reward}}))}getProgress(t,a){var n;const i=(n=this.progressByBuilder.get(t))==null?void 0:n.get(a);return i?{...i}:null}getOrCreateProgress(t,a){const i=this.getProgress(t,a);if(i)return i;const n={missionId:a,cycleKey:"default",status:"available",progress:0,version:1};return this.saveProgress(t,n)}saveProgress(t,a){let i=this.progressByBuilder.get(t);i||(i=new Map,this.progressByBuilder.set(t,i));const n=i.get(a.missionId),s={...a};return i.set(a.missionId,s),(!n||n.status!==s.status||n.progress!==s.progress||n.completedAt!==s.completedAt||n.claimedAt!==s.claimedAt)&&this.emitChange(),{...s}}restoreBuilderProgress(t,a){const i=new Map;for(const n of a)i.set(n.missionId,{...n});this.progressByBuilder.set(t,i),this.emitChange()}getBuilderProgress(t){var a;return Array.from(((a=this.progressByBuilder.get(t))==null?void 0:a.values())??[],i=>({...i}))}reset(){this.progressByBuilder.size!==0&&(this.progressByBuilder.clear(),this.emitChange())}}const q=new da,qe=`
  id,
  builder_id,
  mission_id,
  cycle_key,
  status,
  progress,
  version,
  last_event_at,
  completed_at,
  claimed_at,
  created_at,
  updated_at
`,ca=e=>aa.some(t=>t===e),me=e=>{if(!ca(e.status))throw new Error(`Unknown mission status received: ${e.status}`);return{missionId:e.mission_id,cycleKey:e.cycle_key,status:e.status,progress:e.progress,version:e.version,lastEventAt:e.last_event_at??void 0,completedAt:e.completed_at??void 0,claimedAt:e.claimed_at??void 0}},$e=e=>{const t=e.trim();if(t.length===0)throw new Error("Builder ID is required to load mission progress.");return t},pe=e=>{const t=e.trim();if(t.length===0)throw new Error("Mission ID is required to load mission progress.");return t},ge=e=>{const t=e.trim();if(t.length===0)throw new Error("Cycle key is required to load mission progress.");return t},gt={async loadByBuilder(e){const t=$e(e),{data:a,error:i}=await g.from("mission_progress").select(qe).eq("builder_id",t).order("created_at",{ascending:!0}).returns();if(i)throw new Error(`Mission progress could not be loaded: ${i.message}`);return(a??[]).map(me)},async saveMine(e){const t=pe(e.missionId),a=ge(e.cycleKey),{data:i,error:n}=await g.rpc("save_my_mission_progress",{p_mission_id:t,p_cycle_key:a,p_status:e.status,p_progress:e.progress,p_version:e.version,p_last_event_at:e.lastEventAt??null,p_completed_at:e.completedAt??null,p_claimed_at:e.claimedAt??null});if(n)throw new Error(`Mission progress could not be saved: ${n.message}`);const s=Array.isArray(i)?i[0]:i;if(!s)throw new Error("Mission progress save returned no data.");return me(s)},async claimMine(e,t){const a=pe(e),i=ge(t),{data:n,error:s}=await g.rpc("claim_my_mission_reward",{p_mission_id:a,p_cycle_key:i});if(s)throw new Error(`Mission reward could not be claimed: ${s.message}`);const o=Array.isArray(n)?n[0]:n;if(!o)throw new Error("Mission reward claim returned no data.");const l=o;if(typeof l.claimed_now!="boolean"||typeof l.mission_id!="string"||typeof l.cycle_key!="string"||typeof l.reward_gp!="number"||typeof l.total_gp!="number"||typeof l.claimed_at!="string")throw new Error("Mission reward claim returned invalid data.");return{claimedNow:l.claimed_now,missionId:l.mission_id,cycleKey:l.cycle_key,rewardGp:l.reward_gp,totalGp:l.total_gp,ledgerId:l.ledger_id??void 0,claimedAt:l.claimed_at}},async loadOne(e,t,a){const i=$e(e),n=pe(t),s=ge(a),{data:o,error:l}=await g.from("mission_progress").select(qe).eq("builder_id",i).eq("mission_id",n).eq("cycle_key",s).maybeSingle();if(l)throw new Error(`Mission progress could not be loaded: ${l.message}`);return o?me(o):null}},ua=e=>"amount"in e&&typeof e.amount=="number"&&Number.isFinite(e.amount)&&e.amount>0?Math.max(1,Math.floor(e.amount)):1;class ma{handle(t,a){const i=q.getDefinitionsByEventType(a.type),n=[],s=ua(a);for(const o of i){const l=q.getOrCreateProgress(t,o.id);if(l.status==="completed"||l.status==="claimed"||l.status==="expired"||l.status==="locked")continue;const c=Math.min(o.target,l.progress+s),u=l.progress<o.target&&c>=o.target,b={...l,progress:c,status:u?"completed":"active",completedAt:u?a.occurredAt:l.completedAt},h=q.saveProgress(t,b);gt.saveMine(h).catch(y=>{console.error("Mission progress auto-save failed:",t,o.id,y)}),n.push({definition:o,progress:h,completedNow:u}),u&&console.info("[Mission Completed]",t,o.id)}return n}}const pa=new ma;class ga{constructor(){w(this,"definitions",la.map(t=>({...t,reward:{...t.reward}})));w(this,"progressByBuilder",new Map);w(this,"listeners",new Set);w(this,"version",0)}emitChange(){this.version+=1,this.listeners.forEach(t=>t())}subscribe(t){return this.listeners.add(t),()=>{this.listeners.delete(t)}}getVersion(){return this.version}getDefinitions(){return this.definitions.map(t=>({...t,reward:{...t.reward}}))}getDefinitionsByEventType(t){return this.definitions.filter(a=>a.eventType===t).map(a=>({...a,reward:{...a.reward}}))}getProgress(t,a){var n;const i=(n=this.progressByBuilder.get(t))==null?void 0:n.get(a);return i?{...i}:null}getOrCreateProgress(t,a){const i=this.getProgress(t,a);if(i)return i;const n={achievementId:a,status:"locked",progress:0,version:1};return this.saveProgress(t,n)}saveProgress(t,a){let i=this.progressByBuilder.get(t);i||(i=new Map,this.progressByBuilder.set(t,i));const n={...a};return i.set(a.achievementId,n),this.emitChange(),{...n}}restoreBuilderProgress(t,a){const i=new Map;for(const n of a)i.set(n.achievementId,{...n});this.progressByBuilder.set(t,i),this.emitChange()}getBuilderProgress(t){var a;return Array.from(((a=this.progressByBuilder.get(t))==null?void 0:a.values())??[],i=>({...i}))}reset(){this.progressByBuilder.size!==0&&(this.progressByBuilder.clear(),this.emitChange())}}const $=new ga,Ye=`
  id,
  builder_id,
  achievement_id,
  status,
  progress,
  version,
  last_event_at,
  unlocked_at,
  claimed_at,
  created_at,
  updated_at
`,ha=e=>ia.some(t=>t===e),he=e=>{if(!ha(e.status))throw new Error(`Unknown achievement status received: ${e.status}`);return{achievementId:e.achievement_id,status:e.status,progress:e.progress,version:e.version,lastEventAt:e.last_event_at??void 0,unlockedAt:e.unlocked_at??void 0,claimedAt:e.claimed_at??void 0}},ba=e=>{const t=e.trim();if(t.length===0)throw new Error("Builder ID is required to load achievement progress.");return t},be=e=>{const t=e.trim();if(t.length===0)throw new Error("Achievement ID is required.");return t};class fa{async loadByBuilder(t){const a=ba(t),{data:i,error:n}=await g.from("achievement_progress").select(Ye).eq("builder_id",a).order("created_at",{ascending:!0}).returns();if(n)throw new Error(`Achievement progress could not be loaded: ${n.message}`);return(i??[]).map(he)}async loadOne(t){const a=be(t),{data:i,error:n}=await g.from("achievement_progress").select(Ye).eq("achievement_id",a).maybeSingle();if(n)throw new Error(`Achievement progress could not be loaded: ${n.message}`);return i?he(i):null}async saveMine(t){const a=be(t.achievementId),{data:i,error:n}=await g.rpc("save_my_achievement_progress",{p_achievement_id:a,p_status:t.status,p_progress:t.progress,p_version:t.version,p_last_event_at:t.lastEventAt??null,p_unlocked_at:t.unlockedAt??null,p_claimed_at:t.claimedAt??null});if(n)throw new Error(`Achievement progress could not be saved: ${n.message}`);const s=Array.isArray(i)?i[0]:i;if(!s)throw new Error("Achievement progress save returned no data.");return he(s)}async claimMine(t){const a=be(t),{data:i,error:n}=await g.rpc("claim_my_achievement_reward",{p_achievement_id:a});if(n)throw new Error(`Achievement reward could not be claimed: ${n.message}`);const s=Array.isArray(i)?i[0]:i;if(!s)throw new Error("Achievement reward claim returned no data.");const o=s;if(typeof o.claimed_now!="boolean"||typeof o.achievement_id!="string"||typeof o.reward_gp!="number"||typeof o.total_gp!="number"||typeof o.claimed_at!="string")throw new Error("Achievement reward claim returned invalid data.");return{claimedNow:o.claimed_now,achievementId:o.achievement_id,rewardGp:o.reward_gp,totalGp:o.total_gp,ledgerId:o.ledger_id??void 0,claimedAt:o.claimed_at}}}const ht=new fa,ya=e=>"amount"in e&&typeof e.amount=="number"&&Number.isFinite(e.amount)&&e.amount>0?Math.max(1,Math.floor(e.amount)):1;class va{handle(t,a){const i=$.getDefinitionsByEventType(a.type),n=[],s=ya(a);for(const o of i){const l=$.getOrCreateProgress(t,o.id);if(l.status==="claimed"||l.status==="unlocked")continue;const c=Math.min(o.target,l.progress+s),u=l.progress<o.target&&c>=o.target,b={...l,progress:c,status:u?"unlocked":"locked",version:l.version+1,lastEventAt:a.occurredAt,unlockedAt:u?a.occurredAt:l.unlockedAt},h=$.saveProgress(t,b);ht.saveMine(h).catch(y=>{console.error("Achievement progress auto-save failed:",t,o.id,y)}),n.push({definition:o,progress:h,unlockedNow:u}),u&&console.info("[Achievement Unlocked]",t,o.id)}return n}}const wa=new va,xa="builder-001";class Ea{constructor(){w(this,"started",!1);w(this,"unsubscribe",null)}start(){this.started||(this.started=!0,this.unsubscribe=M.subscribe(t=>{const a=R.getSnapshot();!a.id||a.id===xa||(pa.handle(a.id,t),wa.handle(a.id,t))}))}stop(){var t;(t=this.unsubscribe)==null||t.call(this),this.unsubscribe=null,this.started=!1}}const Ke=new Ea,Sa={async restore(e){const t=e.trim();if(!t)throw new Error("Builder ID is required to restore achievement progress.");const a=await ht.loadByBuilder(t),{data:{session:i}}=await g.auth.getSession();return(i==null?void 0:i.user.id)!==t?[]:($.restoreBuilderProgress(t,a),a)}},Ba={telegram:"verify-telegram",x:"claim-x-reward",instagram:"claim-instagram-reward"},He=e=>{const t=Number(e??0);return Number.isFinite(t)?t:0},_a=async(e,t)=>{const a=e,i=a==null?void 0:a.context;if(i instanceof Response)try{const n=await i.clone().json();if(typeof n.error=="string"&&n.error.trim())return n.error.trim();if(typeof n.message=="string"&&n.message.trim())return n.message.trim();if(typeof n.warning=="string"&&n.warning.trim())return n.warning.trim()}catch{try{const n=await i.clone().text();if(n.trim())return n.trim()}catch{}}return typeof(a==null?void 0:a.message)=="string"&&a.message.trim()?a.message.trim():t},fe=(e,t)=>{const a=e.trim();if(!a)throw new Error(`${t} is required.`);return a};class ka{async claimGenesisReward(t){const{data:{session:a},error:i}=await g.auth.getSession();if(i)throw new Error(`Authenticated session could not be loaded: ${i.message}`);if(!(a!=null&&a.access_token))throw new Error("Authentication is required to claim a GP reward.");const n=Ba[t],{data:s,error:o}=await g.functions.invoke(n,{body:{},headers:{Authorization:`Bearer ${a.access_token}`}});if(o){const l=await _a(o,`${t} GP reward could not be processed.`);throw new Error(l)}if(!s)throw new Error(`${t} GP reward returned no data.`);if(s.error)throw new Error(s.error);return{verified:s.verified===!0,linked:s.linked,rewarded:s.rewarded===!0,alreadyRewarded:s.already_rewarded===!0,rewardGp:He(s.reward_gp),totalGp:He(s.total_gp),message:s.message,warning:s.warning}}async claimMissionReward(t,a){const i=fe(t,"Mission ID"),n=fe(a,"Cycle key"),{data:s,error:o}=await g.rpc("claim_my_mission_reward",{p_mission_id:i,p_cycle_key:n});if(o)throw new Error(`Mission reward could not be claimed: ${o.message}`);const l=Array.isArray(s)?s[0]:s;if(!l)throw new Error("Mission reward claim returned no data.");const c=l;if(typeof c.claimed_now!="boolean"||typeof c.mission_id!="string"||typeof c.cycle_key!="string"||typeof c.reward_gp!="number"||typeof c.total_gp!="number"||typeof c.claimed_at!="string")throw new Error("Mission reward claim returned invalid data.");return{claimedNow:c.claimed_now,missionId:c.mission_id,cycleKey:c.cycle_key,rewardGp:c.reward_gp,totalGp:c.total_gp,ledgerId:c.ledger_id??void 0,claimedAt:c.claimed_at}}async claimAchievementReward(t){const a=fe(t,"Achievement ID"),{data:i,error:n}=await g.rpc("claim_my_achievement_reward",{p_achievement_id:a});if(n)throw new Error(`Achievement reward could not be claimed: ${n.message}`);const s=Array.isArray(i)?i[0]:i;if(!s)throw new Error("Achievement reward claim returned no data.");const o=s;if(typeof o.claimed_now!="boolean"||typeof o.achievement_id!="string"||typeof o.reward_gp!="number"||typeof o.total_gp!="number"||typeof o.claimed_at!="string")throw new Error("Achievement reward claim returned invalid data.");return{claimedNow:o.claimed_now,achievementId:o.achievement_id,rewardGp:o.reward_gp,totalGp:o.total_gp,ledgerId:o.ledger_id??void 0,claimedAt:o.claimed_at}}}const ye=new ka;class Aa{constructor(){w(this,"started",!1)}start(){this.started||(this.started=!0,console.info("[GPEngine] started"))}stop(){this.started&&(this.started=!1,console.info("[GPEngine] stopped"))}async claimGenesisReward(t){if(!this.started)throw new Error("GP Engine must be started before claiming rewards.");return ye.claimGenesisReward(t)}async claimMissionReward(t,a){if(!this.started)throw new Error("GP Engine must be started before claiming rewards.");return ye.claimMissionReward(t,a)}async claimAchievementReward(t){if(!this.started)throw new Error("GP Engine must be started before claiming rewards.");return ye.claimAchievementReward(t)}async claimMiningReward(){if(!this.started)throw new Error("GP Engine must be started before claiming rewards.");return ct.claim()}reward(t){console.info("[GPEngine] reward command reserved",t.source,t.referenceId)}deduct(){console.info("[GPEngine] deduct is not active.")}transfer(){console.info("[GPEngine] transfer is not active.")}getBalance(){return 0}}const Je=new Aa,te=e=>{const t=Number(e??0);return!Number.isFinite(t)||t<0?0:t};class Ia{async loadMine(){const{data:t,error:a}=await g.rpc("get_my_network_gp_balances");if(a)throw new Error(`Network GP balances could not be loaded: ${a.message}`);const i=Array.isArray(t)?t[0]:t;if(!i)throw new Error("Network GP balance query returned no data.");const n=i;return{personalGp:te(n.personal_gp),pendingNetworkGp:te(n.pending_network_gp),eligibleNetworkGp:te(n.eligible_network_gp),totalGp:te(n.total_gp)}}}const Pa=new Ia;class Na{constructor(){w(this,"started",!1)}start(){this.started||(this.started=!0,console.info("[GPNetworkEngine] started"))}stop(){this.started&&(this.started=!1,console.info("[GPNetworkEngine] stopped"))}async getBalances(){if(!this.started)throw new Error("GP Network Engine must be started before loading balances.");return Pa.loadMine()}}const Xe=new Na;class Ca{constructor(){w(this,"started",!1)}start(){this.started||(this.started=!0,Je.start(),Xe.start(),Ke.start())}stop(){this.started&&(Ke.stop(),Xe.stop(),Je.stop(),this.started=!1)}}const Qe=new Ca,ja={async restore(e){const t=e.trim();if(!t)throw new Error("Builder ID is required to restore mission progress.");const a=await gt.loadByBuilder(t),{data:{session:i}}=await g.auth.getSession();return(i==null?void 0:i.user.id)!==t?[]:(q.restoreBuilderProgress(t,a),a)}};function La({children:e}){const{session:t,loading:a}=D(),i=t==null?void 0:t.user.id,n=d.useRef(0);return d.useEffect(()=>{const s=++n.current;let o=!1;const l=()=>!o&&n.current===s;return Qe.stop(),R.reset(),Fe.reset(),q.reset(),$.reset(),a||!i?()=>{o=!0}:((async()=>{try{await Ir()}catch(_){console.error("Builder invite attribution failed:",_)}if(!l())return;const[u,b]=await Promise.allSettled([Rr(i),Fe.restore(i)]);if(!l())return;if(u.status==="rejected"||u.value===null){console.error("Authenticated Builder restore failed:",u.status==="rejected"?u.reason:"Authenticated session changed during restore."),R.reset();return}b.status==="rejected"&&console.error("Authenticated preferences restore failed:",b.reason);const[h,y]=await Promise.allSettled([ja.restore(i),Sa.restore(i)]);if(!l())return;h.status==="rejected"&&console.error("Mission progress restore failed:",h.reason),y.status==="rejected"&&console.error("Achievement progress restore failed:",y.reason);const{data:{session:B}}=await g.auth.getSession();!l()||(B==null?void 0:B.user.id)!==i||Qe.start()})(),()=>{o=!0})},[a,i]),e}const Ra={"blue-galaxy":{id:"blue-galaxy",name:"Blue Galaxy",sectorName:"Azure Horizon",description:"A calm blue sector filled with ice light and distant stellar signals.",palette:{primary:"#3ea6ff",secondary:"#6edcff",accent:"#a9f1ff",glow:"rgba(62, 166, 255, 0.72)",backgroundStart:"#040914",backgroundMiddle:"#07172a",backgroundEnd:"#030810",nebulaPrimary:"rgba(42, 126, 255, 0.30)",nebulaSecondary:"rgba(77, 225, 255, 0.18)",meteorPrimary:"#75ddff",meteorSecondary:"#3d8fff",meteorAccent:"#ffffff"},effects:{meteorDensity:.82,particleDensity:.72,glowIntensity:.78,celebrationIntensity:.25,supernovaEnabled:!0}},"purple-nebula":{id:"purple-nebula",name:"Purple Nebula",sectorName:"Violet Expanse",description:"A deep violet region shaped by luminous nebula clouds and Builder energy.",palette:{primary:"#7c4dff",secondary:"#b36cff",accent:"#e2c6ff",glow:"rgba(132, 77, 255, 0.76)",backgroundStart:"#090519",backgroundMiddle:"#150b31",backgroundEnd:"#050611",nebulaPrimary:"rgba(116, 57, 255, 0.34)",nebulaSecondary:"rgba(191, 92, 255, 0.20)",meteorPrimary:"#c68bff",meteorSecondary:"#704cff",meteorAccent:"#ffffff"},effects:{meteorDensity:.92,particleDensity:.82,glowIntensity:.9,celebrationIntensity:.34,supernovaEnabled:!0}},"emerald-sector":{id:"emerald-sector",name:"Emerald Sector",sectorName:"Verdant Signal",description:"An energized green sector illuminated by aurora currents and active signals.",palette:{primary:"#32e6a1",secondary:"#5fffd0",accent:"#c7ffea",glow:"rgba(46, 235, 166, 0.68)",backgroundStart:"#03110f",backgroundMiddle:"#06251d",backgroundEnd:"#030a0d",nebulaPrimary:"rgba(36, 220, 151, 0.25)",nebulaSecondary:"rgba(50, 184, 255, 0.15)",meteorPrimary:"#77ffd0",meteorSecondary:"#31d29b",meteorAccent:"#efffff"},effects:{meteorDensity:.86,particleDensity:.84,glowIntensity:.76,celebrationIntensity:.3,supernovaEnabled:!0}},"solar-storm":{id:"solar-storm",name:"Solar Storm",sectorName:"Helios Front",description:"A volatile orange sector charged by solar winds and golden stellar eruptions.",palette:{primary:"#ff8b32",secondary:"#ffc34f",accent:"#fff0bd",glow:"rgba(255, 132, 45, 0.72)",backgroundStart:"#160805",backgroundMiddle:"#2b1209",backgroundEnd:"#08070c",nebulaPrimary:"rgba(255, 103, 39, 0.29)",nebulaSecondary:"rgba(255, 196, 72, 0.18)",meteorPrimary:"#ffd173",meteorSecondary:"#ff7a2f",meteorAccent:"#ffffff"},effects:{meteorDensity:1,particleDensity:.76,glowIntensity:.94,celebrationIntensity:.48,supernovaEnabled:!0}},"cosmic-celebration":{id:"cosmic-celebration",name:"Cosmic Celebration",sectorName:"Festival Orbit",description:"A high-energy celebration sector filled with colorful meteors and light bursts.",palette:{primary:"#a65cff",secondary:"#42dbff",accent:"#ffcf5c",glow:"rgba(170, 86, 255, 0.78)",backgroundStart:"#0b061b",backgroundMiddle:"#11183a",backgroundEnd:"#050812",nebulaPrimary:"rgba(171, 75, 255, 0.31)",nebulaSecondary:"rgba(39, 210, 255, 0.22)",meteorPrimary:"#64e7ff",meteorSecondary:"#be7cff",meteorAccent:"#ffd56d"},effects:{meteorDensity:1.25,particleDensity:1,glowIntensity:1,celebrationIntensity:1,supernovaEnabled:!0}},"deep-space":{id:"deep-space",name:"Deep Space",sectorName:"Silent Frontier",description:"A darker remote frontier where ancient stars and distant galaxies dominate.",palette:{primary:"#5868a9",secondary:"#7690d4",accent:"#ccd7ff",glow:"rgba(87, 105, 174, 0.56)",backgroundStart:"#02040a",backgroundMiddle:"#05091a",backgroundEnd:"#010309",nebulaPrimary:"rgba(66, 75, 145, 0.20)",nebulaSecondary:"rgba(51, 116, 157, 0.12)",meteorPrimary:"#9fb9ef",meteorSecondary:"#627bbf",meteorAccent:"#ffffff"},effects:{meteorDensity:.72,particleDensity:1.08,glowIntensity:.55,celebrationIntensity:.12,supernovaEnabled:!1}},"genesis-gold":{id:"genesis-gold",name:"Genesis Gold",sectorName:"Genesis Core",description:"The premium golden origin sector honoring the first generation of Builders.",palette:{primary:"#dcae46",secondary:"#ffd86b",accent:"#fff3c2",glow:"rgba(255, 205, 91, 0.74)",backgroundStart:"#120d04",backgroundMiddle:"#211708",backgroundEnd:"#06060a",nebulaPrimary:"rgba(255, 184, 56, 0.24)",nebulaSecondary:"rgba(145, 79, 255, 0.17)",meteorPrimary:"#ffe18a",meteorSecondary:"#d99732",meteorAccent:"#ffffff"},effects:{meteorDensity:.94,particleDensity:.86,glowIntensity:.96,celebrationIntensity:.66,supernovaEnabled:!0}}};function Ta(e){return Ra[e]}const Oa={0:"genesis-gold",1:"blue-galaxy",2:"purple-nebula",3:"emerald-sector",4:"solar-storm",5:"cosmic-celebration",6:"deep-space"};function Ga(e=new Date){return Oa[e.getDay()]}function Ze(e=new Date,t=null){const a=(t==null?void 0:t.themeId)??Ga(e);return{theme:Ta(a),source:(t==null?void 0:t.source)??"daily",resolvedAt:e.toISOString()}}const Ua=6e4;class Ma{constructor(){w(this,"activeTheme",Ze());w(this,"override",null);w(this,"listeners",new Set);w(this,"refreshTimer",null);w(this,"started",!1)}start(){this.started||(this.started=!0,this.refresh(),typeof window<"u"&&(this.refreshTimer=window.setInterval(()=>{this.refresh()},Ua)))}stop(){this.refreshTimer!==null&&typeof window<"u"&&window.clearInterval(this.refreshTimer),this.refreshTimer=null,this.started=!1}getActiveTheme(){return this.activeTheme}subscribe(t){return this.listeners.add(t),()=>{this.listeners.delete(t)}}setOverride(t){this.override=t,this.refresh()}clearOverride(){this.override=null,this.refresh()}previewTheme(t){this.setOverride({themeId:t,source:"manual"})}refresh(t=new Date){const a=Ze(t,this.override),i=a.theme.id!==this.activeTheme.theme.id||a.source!==this.activeTheme.source;this.activeTheme=a,this.applyCssVariables(a),i&&this.listeners.forEach(n=>{n(a)})}applyCssVariables(t){if(typeof document>"u")return;const a=document.documentElement,{theme:i}=t;a.dataset.universeTheme=i.id,a.dataset.universeThemeSource=t.source,a.style.setProperty("--universe-primary",i.palette.primary),a.style.setProperty("--universe-secondary",i.palette.secondary),a.style.setProperty("--universe-accent",i.palette.accent),a.style.setProperty("--universe-glow",i.palette.glow),a.style.setProperty("--universe-background-start",i.palette.backgroundStart),a.style.setProperty("--universe-background-middle",i.palette.backgroundMiddle),a.style.setProperty("--universe-background-end",i.palette.backgroundEnd),a.style.setProperty("--universe-nebula-primary",i.palette.nebulaPrimary),a.style.setProperty("--universe-nebula-secondary",i.palette.nebulaSecondary),a.style.setProperty("--universe-meteor-primary",i.palette.meteorPrimary),a.style.setProperty("--universe-meteor-secondary",i.palette.meteorSecondary),a.style.setProperty("--universe-meteor-accent",i.palette.meteorAccent),a.style.setProperty("--universe-meteor-density",String(i.effects.meteorDensity)),a.style.setProperty("--universe-particle-density",String(i.effects.particleDensity)),a.style.setProperty("--universe-glow-intensity",String(i.effects.glowIntensity)),a.style.setProperty("--universe-celebration-intensity",String(i.effects.celebrationIntensity))}}const et=new Ma;function Da({children:e}){return d.useEffect(()=>(et.start(),()=>{et.stop()}),[]),e}const bt=document.getElementById("root");if(!bt)throw new Error("Root element not found");_t.createRoot(bt).render(r.jsx(d.StrictMode,{children:r.jsx(tr,{children:r.jsx(Wt,{children:r.jsx(La,{children:r.jsx(Da,{children:r.jsx(kt,{children:r.jsx(ra,{})})})})})})}));export{xr as A,lr as S,ja as a,R as b,Ht as c,D as d,ct as e,M as f,Je as g,X as h,Er as i,vr as j,q as m,Fe as p,Rr as r,g as s,ie as u};
