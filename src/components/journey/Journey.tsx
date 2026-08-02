import { motion } from "framer-motion";
import { ArrowDown, Orbit, Sparkles, Star, Users } from "lucide-react";
import { useLanguage } from "../../core/language";

type Translate = (
  key: string,
  variables?: Record<string, string | number>,
) => string;

const createMilestones = (t: Translate) => [
  {
    value: "1",
    label: t(
      "home.journey.milestone.one.label",
    ),
    text: t(
      "home.journey.milestone.one.text",
    ),
    icon: Star,
  },
  {
    value: "100",
    label: t(
      "home.journey.milestone.hundred.label",
    ),
    text: t(
      "home.journey.milestone.hundred.text",
    ),
    icon: Sparkles,
  },
  {
    value: "1,000",
    label: t(
      "home.journey.milestone.thousand.label",
    ),
    text: t(
      "home.journey.milestone.thousand.text",
    ),
    icon: Orbit,
  },
  {
    value: "100,000",
    label: t(
      "home.journey.milestone.hundredThousand.label",
    ),
    text: t(
      "home.journey.milestone.hundredThousand.text",
    ),
    icon: Users,
  },
] as const;

export function Journey() {
  const { t } = useLanguage();
  const milestones = createMilestones(t);

  return (
    <section className="builder-journey" id="journey">
      <style>{`
        .builder-journey{
          position:relative;
          overflow:hidden;
          margin-top:18px;
          padding:88px 28px;
          border:1px solid rgba(196,181,253,.14);
          border-radius:30px;
          background:
            radial-gradient(circle at 50% 0%,rgba(124,58,237,.18),transparent 38%),
            radial-gradient(circle at 10% 70%,rgba(34,211,238,.08),transparent 28%),
            linear-gradient(180deg,rgba(10,12,24,.96),rgba(5,7,15,.98));
          box-shadow:0 30px 90px rgba(0,0,0,.34);
        }

        .journey-stars,
        .journey-stars::before,
        .journey-stars::after{
          position:absolute;
          inset:0;
          pointer-events:none;
          content:"";
          background-image:
            radial-gradient(circle,rgba(255,255,255,.75) 0 1px,transparent 1.4px);
          background-size:58px 58px;
          opacity:.18;
        }

        .journey-stars::before{
          transform:translate(21px,17px) scale(.72);
          opacity:.14;
        }

        .journey-stars::after{
          transform:translate(-16px,28px) scale(1.18);
          opacity:.08;
        }

        .journey-inner{
          position:relative;
          z-index:2;
          width:min(1120px,100%);
          margin:0 auto;
        }

        .journey-intro{
          max-width:770px;
          margin:0 auto 64px;
          text-align:center;
        }

        .journey-kicker{
          display:inline-flex;
          align-items:center;
          gap:9px;
          margin-bottom:16px;
          color:#67e8f9;
          font-size:10px;
          font-weight:900;
          letter-spacing:.2em;
        }

        .journey-intro h2{
          margin:0;
          color:#fff;
          font-size:clamp(42px,7vw,76px);
          line-height:.95;
          letter-spacing:-.055em;
        }

        .journey-intro p{
          max-width:650px;
          margin:24px auto 0;
          color:#aaa1b8;
          font-size:15px;
          line-height:1.8;
        }

        .journey-intro strong{
          color:#f5f0ff;
        }

        .journey-flow{
          display:grid;
          grid-template-columns:repeat(4,1fr);
          gap:14px;
          margin-top:38px;
        }

        .journey-card{
          position:relative;
          min-height:260px;
          padding:25px;
          border:1px solid rgba(255,255,255,.06);
          border-radius:22px;
          background:rgba(255,255,255,.025);
          backdrop-filter:blur(14px);
        }

        .journey-card::after{
          position:absolute;
          top:50%;
          right:-12px;
          width:24px;
          height:1px;
          content:"";
          background:linear-gradient(90deg,rgba(139,92,246,.65),transparent);
        }

        .journey-card:last-child::after{
          display:none;
        }

        .journey-icon{
          display:grid;
          width:45px;
          height:45px;
          place-items:center;
          margin-bottom:30px;
          border-radius:14px;
          color:#c4b5fd;
          background:rgba(139,92,246,.1);
          box-shadow:inset 0 1px rgba(255,255,255,.04);
        }

        .journey-value{
          margin-bottom:2px;
          color:#fff;
          font-size:37px;
          font-weight:900;
          letter-spacing:-.045em;
        }

        .journey-label{
          color:#67e8f9;
          font-size:10px;
          font-weight:900;
          letter-spacing:.16em;
          text-transform:uppercase;
        }

        .journey-card p{
          margin:18px 0 0;
          color:#8f879c;
          font-size:11px;
          line-height:1.7;
        }

        .journey-manifesto{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:28px;
          margin-top:64px;
          padding:31px;
          border:1px solid rgba(103,232,249,.12);
          border-radius:22px;
          background:
            linear-gradient(100deg,rgba(34,211,238,.055),rgba(139,92,246,.07));
        }

        .journey-manifesto h3{
          max-width:690px;
          margin:0;
          color:#f8f5ff;
          font-size:clamp(24px,4vw,40px);
          line-height:1.12;
          letter-spacing:-.035em;
        }

        .journey-manifesto p{
          max-width:690px;
          margin:13px 0 0;
          color:#958ca3;
          font-size:12px;
          line-height:1.7;
        }

        .journey-cta{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:10px;
          flex:none;
          min-height:50px;
          padding:0 20px;
          border:1px solid rgba(103,232,249,.24);
          border-radius:14px;
          color:#071018;
          background:linear-gradient(135deg,#a78bfa,#67e8f9);
          font-size:10px;
          font-weight:950;
          letter-spacing:.12em;
          text-decoration:none;
          box-shadow:0 15px 36px rgba(103,232,249,.12);
        }

        @media(max-width:980px){
          .journey-flow{
            grid-template-columns:repeat(2,1fr);
          }

          .journey-card:nth-child(2)::after{
            display:none;
          }

          .journey-manifesto{
            align-items:flex-start;
            flex-direction:column;
          }
        }

        @media(max-width:600px){
          .builder-journey{
            padding:68px 18px;
          }

          .journey-flow{
            grid-template-columns:1fr;
          }

          .journey-card::after{
            display:none;
          }

          .journey-manifesto{
            padding:23px;
          }

          .journey-cta{
            width:100%;
          }
        }
      `}</style>

      <div className="journey-stars" />

      <div className="journey-inner">
        <motion.header
          className="journey-intro"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.65 }}
        >
          <div className="journey-kicker">
            <Sparkles size={14} />
            {t("home.journey.kicker")}
          </div>

          <h2>{t("home.journey.title")}</h2>

          <p>
            {t("home.journey.description.prefix")}{" "}
            <strong>
              {t(
                "home.journey.description.emphasis",
              )}
            </strong>
            {t("home.journey.description.suffix")}
          </p>
        </motion.header>

        <div className="journey-flow">
          {milestones.map(({ value, label, text, icon: Icon }, index) => (
            <motion.article
              className="journey-card"
              key={value}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: index * 0.1, duration: 0.55 }}
            >
              <div className="journey-icon">
                <Icon size={21} />
              </div>

              <div className="journey-value">{value}</div>
              <div className="journey-label">{label}</div>
              <p>{text}</p>
            </motion.article>
          ))}
        </div>

        <motion.div
          className="journey-manifesto"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.65 }}
        >
          <div>
            <h3>
              {t("home.journey.manifesto.title")}
            </h3>

            <p>
              {t(
                "home.journey.manifesto.description",
              )}
            </p>
          </div>

          <a
            className="journey-cta"
            href="#community"
          >
            {t("home.journey.cta")}
            <ArrowDown size={15} />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
