import{motion}from"framer-motion";
import{ArrowUpRight,Orbit,RadioTower,Sparkles,Users}from"lucide-react";
import{Link}from"react-router-dom";

const stats=[
  ["Active Builders","12,482",Users],
  ["Sectors Stabilized","842",Sparkles],
  ["Signals Received","2.4M",RadioTower],
]as const;

const fade={hidden:{opacity:0,y:24},show:{opacity:1,y:0}};

export function Home(){
  return <motion.div initial="hidden" animate="show" transition={{staggerChildren:.12}}>
    <section className="hero">
      <motion.div variants={fade} transition={{duration:.7}}>
        <span>THE FIRST LIGHT IS ACTIVE</span>
        <h1>We are <b>building space.</b></h1>
        <p>BOBU Universe is a living digital civilization shaped by Builders, missions, signals and discoveries.</p>
        <div className="actions">
          <Link to="/missions">Enter Mission Center <ArrowUpRight size={18}/></Link>
          <Link to="/galaxy" className="ghost">Explore the galaxy</Link>
        </div>
        <div className="signal-line"><i/>LIVE SIGNAL · GENESIS SECTOR 01</div>
      </motion.div>

      <motion.div className="planet" variants={fade} animate={{y:[0,-12,0]}} transition={{duration:6,repeat:Infinity,ease:"easeInOut"}}>
        <span className="orbit orbit-a"/>
        <span className="orbit orbit-b"/>
        <div className="planet-core"><span>GENESIS</span></div>
        <p className="planet-label"><Orbit size={14}/> SECTOR ONLINE</p>
      </motion.div>
    </section>

    <motion.section className="stats" variants={fade} transition={{duration:.65}}>
      {stats.map(([label,value,Icon])=><article className="glass" key={label}><Icon/><strong>{value}</strong><span>{label}</span></article>)}
    </motion.section>

    <motion.section className="glass quote" variants={fade} transition={{duration:.65}}>
      <div><span>LATEST TRANSMISSION</span><h2>“The universe is not waiting for heroes.”</h2><p>“It is waiting for Builders.”</p></div>
      <em>— Wizard BOBU</em>
    </motion.section>
  </motion.div>
}
