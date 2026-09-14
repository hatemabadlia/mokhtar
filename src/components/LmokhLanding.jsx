import React from "react";
import { Link } from "react-router-dom";

const fmt = (n) => n.toLocaleString("en-US");

/* Price with optional original (pre-discount) price + discount badge */
function Price({ amount, old }) {
  const pct = old ? Math.round((1 - amount / old) * 100) : null;
  return (
    <span className="p-amount">
      {old && (
        <span className="p-was">
          <s className="p-old">
            {fmt(old)}
            <span className="cur">د.ج</span>
          </s>
          <span className="p-save">-{pct}%</span>
        </span>
      )}
      <span className="p-new">
        {fmt(amount)}
        <span className="cur">د.ج</span>
      </span>
    </span>
  );
}

/* Savings bar shown under bundle offers */
function SaveBar({ amount, old }) {
  const pct = Math.round((1 - amount / old) * 100);
  return (
    <div className="save-bar" role="img" aria-label={`توفّر ${fmt(old - amount)} د.ج`}>
      <div className="save-bar-track">
        <div className="save-bar-fill" style={{ width: `${pct}%` }}></div>
      </div>
      <span className="save-bar-text">
        توفّر <b>{fmt(old - amount)} د.ج</b> مقارنة بالشراء المنفصل
      </span>
    </div>
  );
}


export default function LmokhLanding() {
  return (
    <div dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="true"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <style>{`

  :root{
    --ink-teal: #0E3B36;
    --ink-teal-deep: #092824;
    --parchment: #F6EEDC;
    --parchment-dim: #EFE3C8;
    --gold: #E3A23C;
    --gold-bright: #F0B85C;
    --crimson: #B23A2E;
    --text-dark: #1C1A15;
    --line: rgba(28,26,21,0.12);
  }
  *{margin:0;padding:0;box-sizing:border-box;}
  html{scroll-behavior:smooth;}
  body{
    background: var(--parchment);
    color: var(--text-dark);
    font-family:'IBM Plex Sans Arabic', sans-serif;
    line-height:1.7;
    overflow-x:hidden;
  }
  .display{font-family:'Aref Ruqaa', serif;}
  .mono{font-family:'IBM Plex Mono', monospace; letter-spacing:0.03em;}

  /* paper grain */
  .grain{
    position:fixed; inset:0; pointer-events:none; z-index:1; opacity:0.05; mix-blend-mode:multiply;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  a{color:inherit; text-decoration:none;}
  .wrap{max-width:1180px; margin:0 auto; padding:0 32px;}

  /* ===== NAV ===== */
  nav{
    position:sticky; top:0; z-index:50;
    background:rgba(246,238,220,0.88); backdrop-filter:blur(10px);
    border-bottom:1px solid var(--line);
  }
  nav .wrap{display:flex; align-items:center; justify-content:space-between; height:76px;}
  .logo{display:flex; align-items:center; gap:10px;}
  .logo-mark{
    width:38px; height:38px; border-radius:50%;
    background:var(--ink-teal); color:var(--gold-bright);
    display:flex; align-items:center; justify-content:center;
    font-family:'Aref Ruqaa', serif; font-size:20px; font-weight:700;
    border:2px solid var(--gold);
  }
  .logo-text{font-family:'Aref Ruqaa', serif; font-size:26px; font-weight:700; color:var(--ink-teal);}
  .nav-links{display:flex; gap:36px; font-size:15px; font-weight:500;}
  .nav-links a{position:relative; padding:6px 0; opacity:0.8; transition:opacity .2s;}
  .nav-links a:hover{opacity:1;}
  .nav-cta{
    background:var(--ink-teal); color:var(--parchment);
    padding:11px 26px; border-radius:999px; font-size:14.5px; font-weight:600;
    border:1px solid var(--ink-teal); transition:all .25s;
  }
  .nav-cta:hover{background:var(--gold); border-color:var(--gold); color:var(--ink-teal-deep);}
  .mobile-toggle{display:none;}

  /* ===== HERO ===== */
  .hero{
    position:relative; background:var(--ink-teal); color:var(--parchment);
    padding:90px 0 130px; overflow:hidden;
  }
  .hero::before{
    content:''; position:absolute; inset:0;
    background: radial-gradient(ellipse 700px 500px at 85% 15%, rgba(227,162,60,0.16), transparent 60%),
                radial-gradient(ellipse 500px 400px at 10% 90%, rgba(178,58,46,0.12), transparent 60%);
  }
  .hero-grid{position:relative; z-index:2; display:grid; grid-template-columns:1.15fr 0.85fr; gap:50px; align-items:center;}
  .eyebrow{
    display:inline-flex; align-items:center; gap:10px;
    font-family:'IBM Plex Mono', monospace; font-size:12.5px; letter-spacing:0.12em;
    color:var(--gold-bright); border:1px solid rgba(227,162,60,0.4); border-radius:999px;
    padding:7px 16px; margin-bottom:26px;
  }
  .eyebrow::before{content:''; width:6px; height:6px; border-radius:50%; background:var(--gold-bright);}
  .hero h1{
    font-family:'Aref Ruqaa', serif; font-weight:700; font-size:58px; line-height:1.28;
    margin-bottom:26px;
  }
  .hero h1 .accent{color:var(--gold-bright);}
  .hero p.lead{font-size:18px; color:rgba(246,238,220,0.78); max-width:520px; margin-bottom:38px; font-weight:300;}
  .hero-actions{display:flex; gap:16px; align-items:center; margin-bottom:56px;}
  .btn-primary{
    background:var(--gold); color:var(--ink-teal-deep); font-weight:700; font-size:16px;
    padding:16px 34px; border-radius:999px; display:inline-block; transition:all .25s;
    box-shadow:0 8px 24px rgba(227,162,60,0.28);
  }
  .btn-primary:hover{background:var(--gold-bright); transform:translateY(-2px); box-shadow:0 12px 30px rgba(227,162,60,0.38);}
  .btn-ghost{
    color:var(--parchment); font-weight:600; font-size:15.5px; padding:16px 8px;
    border-bottom:1px solid rgba(246,238,220,0.4); transition:border-color .2s;
  }
  .btn-ghost:hover{border-color:var(--gold-bright); color:var(--gold-bright);}

  .stat-row{display:flex; gap:44px;}
  .stat-num{font-family:'Aref Ruqaa', serif; font-size:32px; color:var(--gold-bright); font-weight:700;}
  .stat-label{font-size:13px; color:rgba(246,238,220,0.6); margin-top:2px;}

  /* seal */
  .seal-wrap{position:relative; display:flex; justify-content:center; align-items:center; height:100%;}
  .seal{
    width:290px; height:290px; border-radius:50%; position:relative;
    background: conic-gradient(from 0deg, var(--gold) 0deg, var(--gold-bright) 20deg, var(--gold) 40deg);
    -webkit-mask: radial-gradient(circle, transparent 0, transparent calc(50% - 14px), black calc(50% - 13px));
    animation: spin 40s linear infinite;
  }
  @keyframes spin{to{transform:rotate(360deg);}}
  .seal-inner{
    position:absolute; inset:22px; border-radius:50%;
    border:2px solid var(--gold); background:var(--ink-teal-deep);
    display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;
    box-shadow: inset 0 0 0 6px rgba(227,162,60,0.12);
  }
  .seal-inner .star{color:var(--gold-bright); font-size:26px; margin-bottom:6px;}
  .seal-inner .word{font-family:'Aref Ruqaa', serif; font-size:34px; color:var(--parchment); font-weight:700;}
  .seal-inner .sub{font-family:'IBM Plex Mono', monospace; font-size:10.5px; color:var(--gold-bright); letter-spacing:0.15em; margin-top:8px;}
  .seal-inner{ overflow:hidden; }
.teacher-photo{
  position:absolute; inset:0; width:100%; height:100%;
  object-fit:cover; object-position:top center;
}
.seal-caption{
  position:absolute; bottom:16px; left:50%; transform:translateX(-50%);
  display:flex; align-items:center; gap:6px; white-space:nowrap;
  background:rgba(9,40,36,0.78); backdrop-filter:blur(4px);
  padding:6px 16px; border-radius:999px;
  font-family:'IBM Plex Mono', monospace; font-size:11px;
  color:var(--gold-bright); letter-spacing:0.04em; z-index:2;
}
.seal-caption .star{ font-size:12px; }
  .seal-float{
    position:absolute; width:76px; height:76px; border-radius:50%;
    background:var(--crimson); color:var(--parchment); display:flex; align-items:center; justify-content:center;
    font-family:'Aref Ruqaa', serif; font-size:13px; font-weight:700; text-align:center; line-height:1.3;
    top:-8px; left:-10px; border:3px solid var(--parchment); transform:rotate(-14deg);
    box-shadow:0 10px 24px rgba(0,0,0,0.3);
  }

  /* ===== SECTION LABEL / DIVIDER (signature reused small) ===== */
  .section-head{display:flex; align-items:center; gap:18px; margin-bottom:50px;}
  .mini-seal{
    width:44px; height:44px; border-radius:50%; flex-shrink:0;
    background:var(--ink-teal); border:1.5px solid var(--gold);
    display:flex; align-items:center; justify-content:center;
    font-family:'Aref Ruqaa', serif; color:var(--gold-bright); font-size:18px;
  }
  .section-head h2{font-family:'Aref Ruqaa', serif; font-size:36px; color:var(--ink-teal);}
  .section-head .rule{flex:1; height:1px; background:var(--line);}

  /* ===== ABOUT / DEDICATION ===== */
  .about{padding:110px 0; background:var(--parchment);}
  .about-grid{display:grid; grid-template-columns:0.9fr 1.1fr; gap:70px; align-items:start;}
  .dedication-card{
    background:var(--ink-teal); color:var(--parchment); border-radius:22px; padding:44px 38px;
    position:relative; overflow:hidden;
  }
  .dedication-card::before{
    content:'"'; position:absolute; top:-10px; right:20px; font-family:'Aref Ruqaa', serif;
    font-size:160px; color:rgba(227,162,60,0.14); line-height:1;
  }
  .dedication-card .label{font-family:'IBM Plex Mono', monospace; font-size:12px; color:var(--gold-bright); letter-spacing:0.12em; margin-bottom:18px; position:relative;}
  .dedication-card p{font-size:17px; color:rgba(246,238,220,0.92); position:relative; margin-bottom:20px;}
  .dedication-card .signee{font-family:'Aref Ruqaa', serif; font-size:22px; color:var(--gold-bright); position:relative;}
  .about-text h2{font-family:'Aref Ruqaa', serif; font-size:38px; color:var(--ink-teal); margin-bottom:22px; line-height:1.4;}
  .about-text p{font-size:16.5px; color:#3a362c; margin-bottom:18px;}
  .about-text p strong{color:var(--ink-teal);}

  /* ===== STREAMS ===== */
  .streams{padding:110px 0; background:var(--parchment-dim); position:relative;}
  .stream-grid{display:grid; grid-template-columns:repeat(3, 1fr); gap:22px;}
  .stream-card{
    background:var(--parchment); border:1px solid var(--line); border-radius:18px; padding:30px 26px;
    transition:all .3s; position:relative; overflow:hidden;
  }
  .stream-card:hover{transform:translateY(-6px); box-shadow:0 20px 40px rgba(14,59,54,0.12); border-color:var(--gold);}
  .stream-code{font-family:'IBM Plex Mono', monospace; font-size:11.5px; color:var(--gold); letter-spacing:0.1em; margin-bottom:14px; display:block;}
  .stream-card h3{font-family:'Aref Ruqaa', serif; font-size:24px; color:var(--ink-teal); margin-bottom:10px;}
  .stream-card p{font-size:14.5px; color:#5c584c;}

  /* ===== FEATURES ===== */
  .features{padding:110px 0; background:var(--parchment);}
  .feature-grid{display:grid; grid-template-columns:repeat(4, 1fr); gap:24px;}
  .feature-card{padding:34px 24px; border-radius:18px; background:var(--parchment-dim); border:1px solid var(--line);}
  .feature-icon{
    width:52px; height:52px; border-radius:14px; background:var(--ink-teal);
    display:flex; align-items:center; justify-content:center; margin-bottom:20px;
    color:var(--gold-bright); font-size:22px;
  }
  .feature-card h3{font-family:'Aref Ruqaa', serif; font-size:21px; color:var(--ink-teal); margin-bottom:10px;}
  .feature-card p{font-size:14px; color:#5c584c; line-height:1.65;}

  /* ===== STATS BAND ===== */
  /* ===== PRICING ===== */
  .pricing{padding:110px 0; background:var(--parchment-dim);}
  .pricing-grid{display:grid; grid-template-columns:repeat(auto-fit, minmax(290px, 1fr)); gap:26px; align-items:stretch;}
  .price-card{
    background:var(--parchment); border:1.5px solid var(--line); border-radius:20px; padding:36px 32px;
    position:relative; overflow:hidden; transition:all .3s;
  }
  .price-card.highlight{ border-color:var(--gold); box-shadow:0 20px 44px rgba(227,162,60,0.16); }
  .price-card .ribbon{
    position:absolute; top:18px; left:-38px; transform:rotate(-45deg);
    background:var(--gold); color:var(--ink-teal-deep); font-size:11px; font-weight:700;
    padding:5px 44px; font-family:'IBM Plex Mono', monospace;
  }
  .price-card .tag{
    display:inline-block; margin-bottom:8px;
    font-family:'IBM Plex Mono', monospace; font-size:10.5px; letter-spacing:0.14em;
    color:var(--gold); border:1px solid rgba(227,162,60,0.5);
    border-radius:999px; padding:3px 12px; background:rgba(227,162,60,0.08);
  }
  .price-card.highlight{ padding-top:46px; }
  .price-card.highlight .tag{ margin-top:4px; }
  .price-card h3{ font-family:'Aref Ruqaa', serif; font-size:24px; color:var(--ink-teal); margin-bottom:8px; }
  .price-card .p-desc{ font-size:14px; color:#5c584c; margin-bottom:22px; }
  .price-plan{
    display:flex; justify-content:space-between; align-items:center; gap:14px; padding:16px 0;
  }
  .price-plan + .price-plan{ border-top:1px dashed var(--line); }
  .price-plan .p-label{ font-size:14.5px; color:var(--text-dark); font-weight:500; line-height:1.45; }
  .p-amount{ display:flex; flex-direction:column; align-items:flex-end; gap:2px; flex-shrink:0; }
  .p-was{ display:flex; align-items:center; gap:8px; }
  .p-old{
    font-family:'IBM Plex Mono', monospace; font-size:13px; color:#8a8574;
    text-decoration:line-through; text-decoration-color:var(--crimson); text-decoration-thickness:1.5px;
  }
  .p-old .cur{ font-size:10px; }
  .p-save{
    font-family:'IBM Plex Mono', monospace; font-size:10.5px; font-weight:700; letter-spacing:0.04em;
    color:#fff; background:var(--crimson); border-radius:999px; padding:2px 8px; line-height:1.5;
  }
  .p-new{ font-family:'Aref Ruqaa', serif; font-size:28px; line-height:1.1; color:var(--ink-teal); }
  .price-card.highlight .p-new{ font-size:34px; }
  .p-amount .cur{ font-family:'IBM Plex Sans Arabic', sans-serif; font-size:12px; color:#8a8574; margin-inline-start:4px; }
  .save-bar{
    margin-top:18px; padding:12px 14px; border-radius:12px;
    background:rgba(227,162,60,0.12); border:1px dashed rgba(227,162,60,0.55);
  }
  .save-bar-track{ height:6px; border-radius:999px; background:rgba(14,59,54,0.12); overflow:hidden; }
  .save-bar-fill{ height:100%; border-radius:999px; background:linear-gradient(90deg, var(--gold), var(--gold-bright)); }
  .save-bar-text{ display:block; margin-top:8px; font-size:12.5px; color:var(--ink-teal); }
  .save-bar-text b{ font-weight:700; }
  .price-note{ font-size:12.5px; color:#8a8574; margin-top:16px; }

  /* ===== STEPS ===== */
  .steps{padding:110px 0; background:var(--parchment);}
  .steps-list{ display:flex; flex-direction:column; gap:0; }
  .step-row{ display:flex; gap:22px; padding:26px 0; border-bottom:1px solid var(--line); }
  .step-row:last-child{ border-bottom:none; }
  .step-num{
    flex-shrink:0; width:52px; height:52px; border-radius:50%; background:var(--ink-teal);
    color:var(--gold-bright); display:flex; align-items:center; justify-content:center;
    font-family:'Aref Ruqaa', serif; font-size:22px; border:1.5px solid var(--gold);
  }
  .step-text h3{ font-family:'Aref Ruqaa', serif; font-size:21px; color:var(--ink-teal); margin-bottom:6px; }
  .step-text p{ font-size:14.5px; color:#5c584c; max-width:520px; }

  /* ===== CONTACT ===== */
  .contact{padding:110px 0; background:var(--ink-teal); color:var(--parchment); position:relative; overflow:hidden;}
  .contact::before{
    content:''; position:absolute; inset:0;
    background:radial-gradient(ellipse 600px 500px at 15% 20%, rgba(227,162,60,0.14), transparent 60%);
  }
  .contact .section-head h2{ color:var(--parchment); }
  .contact .section-head .rule{ background:rgba(246,238,220,0.18); }
  .contact .mini-seal{ background:var(--ink-teal-deep); }
  .contact-grid{ display:grid; grid-template-columns:1fr 1fr; gap:26px; position:relative; z-index:2; }
  .contact-card{
    background:rgba(246,238,220,0.06); border:1px solid rgba(246,238,220,0.18); border-radius:16px;
    padding:26px; display:flex; align-items:center; gap:16px;
  }
  .contact-card .c-icon{
    width:46px; height:46px; border-radius:12px; background:var(--gold); color:var(--ink-teal-deep);
    display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0;
  }
  .contact-card .c-label{ font-family:'IBM Plex Mono', monospace; font-size:11px; color:var(--gold-bright); margin-bottom:4px; }
  .contact-card .c-value{ font-size:15px; font-weight:600; }

  .stats-band{background:var(--ink-teal-deep); padding:64px 0;}
  .stats-band .wrap{display:flex; justify-content:space-around; flex-wrap:wrap; gap:30px;}
  .sb-item{text-align:center;}
  .sb-item .num{font-family:'Aref Ruqaa', serif; font-size:44px; color:var(--gold-bright);}
  .sb-item .lbl{font-family:'IBM Plex Mono', monospace; font-size:11.5px; color:rgba(246,238,220,0.55); letter-spacing:0.1em; margin-top:6px;}

  /* ===== FINAL CTA ===== */
  .final-cta{padding:130px 0; text-align:center; background:var(--parchment); position:relative;}
  .final-cta h2{font-family:'Aref Ruqaa', serif; font-size:44px; color:var(--ink-teal); max-width:680px; margin:0 auto 20px; line-height:1.4;}
  .final-cta p{font-size:16.5px; color:#5c584c; margin-bottom:38px;}

  footer{background:var(--ink-teal-deep); color:rgba(246,238,220,0.6); padding:50px 0 34px;}
  footer .wrap{display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px;}
  footer .f-logo{font-family:'Aref Ruqaa', serif; font-size:22px; color:var(--parchment);}
  footer .f-links{display:flex; gap:28px; font-size:14px;}
  footer .f-bottom{font-size:12.5px; margin-top:30px; text-align:center; border-top:1px solid rgba(246,238,220,0.1); padding-top:24px;}

  @media (max-width: 900px){
    .hero-grid{grid-template-columns:1fr; text-align:center;}
    .hero p.lead{margin-left:auto; margin-right:auto;}
    .hero-actions{justify-content:center;}
    .stat-row{justify-content:center;}
    .about-grid{grid-template-columns:1fr;}
    .stream-grid{grid-template-columns:1fr 1fr;}
    .feature-grid{grid-template-columns:1fr 1fr;}
    .contact-grid{grid-template-columns:1fr;}
    .step-row{flex-direction:column; gap:12px;}
    .nav-links{display:none;}
    .hero h1{font-size:42px;}
    .seal{width:220px; height:220px;}
  }
  @media (max-width: 560px){
    .stream-grid, .feature-grid{grid-template-columns:1fr;}
    .pricing-grid{grid-template-columns:1fr;}
    .wrap{padding:0 20px;}
  }
  @media (prefers-reduced-motion: reduce){
    .seal{animation:none;}
    html{scroll-behavior:auto;}
  }

      `}</style>

      <div className="grain"></div>

      <div className="grain"></div>

      <nav>
        <div className="wrap">
          <div className="logo">
            <div className="logo-mark">م</div>
            <div className="logo-text">المخ</div>
          </div>
          <div className="nav-links">
            <a href="#about">قصتنا</a>
            <a href="#streams">الشعب</a>
            <a href="#features">كيف تعمل المنصة</a>
            <a href="#pricing">الأسعار</a>
            <a href="#contact">تواصل معنا</a>
          </div>
          <Link to="/auth" className="nav-cta">
            ابدأ رحلتك
          </Link>
        </div>
      </nav>

      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="eyebrow">
              رياضيات وفيزياء · من الرابعة متوسط إلى البكالوريا
            </div>
            <h1>
              طريقك نحو <span className="accent">النجاح</span>
              <br />
              يبدأ من هنا
            </h1>
            <p className="lead">
              دروس فيديو، تمارين تفاعلية، وحصص مباشرة مع الأستاذ سيد مختار — في
              الرياضيات والفيزياء، من شهادة التعليم المتوسط إلى البكالوريا.
            </p>
            <div className="hero-actions">
              <Link to="/auth" className="btn-primary">
                ابدأ رحلتك مجانًا
              </Link>
              <a href="#streams" className="btn-ghost">
                اكتشف المستويات →
              </a>
            </div>
            <div className="stat-row">
              <div>
                <div className="stat-num">٢</div>
                <div className="stat-label">مادتان: رياضيات وفيزياء</div>
              </div>
              <div>
                <div className="stat-num">٤</div>
                <div className="stat-label">مستويات دراسية</div>
              </div>
              <div>
                <div className="stat-num">مباشر</div>
                <div className="stat-label">حصص مع الأستاذ مختار</div>
              </div>
            </div>
          </div>
          <div className="seal-wrap">
            <div className="seal">
              <div className="seal-inner"></div>
            </div>
            <div className="seal-inner">
              <img
                src="/images/sid-mokhtar.jpeg"
                alt="الأستاذ سيد مختار"
                className="teacher-photo"
              />
              <div className="seal-caption">
                <span className="star">★</span>
                <span>أ. سيد مختار</span>
              </div>
            </div>
            <div className="seal-float">
              اول 
              <br />
              منصة تعليمية في تبسة
            </div>
          </div>
        </div>
      </section>

      <section className="about" id="about">
        <div className="wrap">
          <div className="section-head">
            <div className="mini-seal">م</div>
            <h2>قصتنا</h2>
            <div className="rule"></div>
          </div>
          <div className="about-grid">
            <div className="dedication-card">
              <div className="label"></div>
              <p>
                 
                <strong style={{ color: "var(--gold-bright)" }}>
                  صيد مختار
                </strong>
                ،  أستاذ آمن بطلابه قبل أن
                يؤمنوا بأنفسهم، وحوّل الرياضيات والفيزياء من مادتين صعبتين إلى
                شغف حقيقي.
              </p>
              <p>
                كل درس هنا يحمل جزءًا من أسلوبه: الصبر، الدقة، والإيمان بأن كل
                طالب قادر على النجاح.
              </p>
            </div>
            <div className="about-text">
              <h2>منصة بُنيت حول أسلوب أستاذ واحد</h2>
              <p>
                نعرف جيدًا ما يعيشه طالب الرياضيات والفيزياء في الجزائر، من
                الرابعة متوسط إلى البكالوريا: برنامج كثيف، وحاجة حقيقية لمن يشرح
                بأسلوب واضح ومباشر.
              </p>
              <p>
                <strong>المخ</strong> منصة مخصصة بالكامل لدروس الأستاذ سيد مختار
                — تجمع بين الدروس المسجلة، التمارين التفاعلية، والحصص المباشرة،
                لكل مستوى من الرابعة متوسط إلى البكالوريا.
              </p>
              <p>
                هدفنا بسيط: أن يصل كل طالب إلى يوم الامتحان وهو واثق من نفسه،
                بفضل نفس الأسلوب الذي صنع الفرق معي.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="streams" id="streams">
        <div className="wrap">
          <div className="section-head">
            <div className="mini-seal">٤</div>
            <h2>المستويات الدراسية</h2>
            <div className="rule"></div>
          </div>
          <div
            className="stream-grid"
            style={{ gridTemplateColumns: "repeat(4,1fr)" }}
          >
            <div className="stream-card">
              <span className="stream-code">LEVEL · BEM</span>
              <h3>الرابعة متوسط</h3>
              <p>تحضير مكثف لشهادة التعليم المتوسط في الرياضيات والفيزياء.</p>
            </div>
            <div className="stream-card">
              <span className="stream-code">LEVEL · 1AS</span>
              <h3>السنة أولى ثانوي</h3>
              <p>بناء الأساس في الرياضيات والفيزياء لكل الشعب.</p>
            </div>
            <div className="stream-card">
              <span className="stream-code">LEVEL · 2AS</span>
              <h3>السنة ثانية ثانوي</h3>
              <p>تعميق المفاهيم استعدادًا للسنة النهائية.</p>
            </div>
            <div className="stream-card">
              <span className="stream-code">LEVEL · BAC</span>
              <h3>البكالوريا</h3>
              <p>
                مراجعة شاملة ومواضيع سابقة مع الحلول، في الرياضيات والفيزياء.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="features" id="features">
        <div className="wrap">
          <div className="section-head">
            <div className="mini-seal">؟</div>
            <h2>كيف تعمل المنصة</h2>
            <div className="rule"></div>
          </div>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">▶</div>
              <h3>دروس فيديو</h3>
              <p>
                شرح مفصل لكل درس في المنهاج، يمكنك مشاهدته بالسرعة التي تناسبك.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">✎</div>
              <h3>تمارين تفاعلية</h3>
              <p>اختبر فهمك بعد كل درس مع تصحيح فوري ونقاط ضعف محددة.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">◐</div>
              <h3>حصص مباشرة</h3>
              <p>تواصل مباشر مع الأستاذ لطرح الأسئلة ومراجعة النقاط الصعبة.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">▤</div>
              <h3>مواضيع سابقة</h3>
              <p>مكتبة كاملة لمواضيع البكالوريا السابقة مع الحلول النموذجية.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="steps" id="how">
        <div className="wrap">
          <div className="section-head">
            <div className="mini-seal">١</div>
            <h2>كيف تنضم إلينا</h2>
            <div className="rule"></div>
          </div>
          <div className="steps-list">
            <div className="step-row">
              <div className="step-num">١</div>
              <div className="step-text">
                <h3>أنشئ حسابك</h3>
                <p>
                  سجّل باسمك الكامل ورقم هاتفك وبريدك الإلكتروني، واختر مستواك
                  الدراسي (من الرابعة متوسط إلى البكالوريا).
                </p>
              </div>
            </div>
            <div className="step-row">
              <div className="step-num">٢</div>
              <div className="step-text">
                <h3>فعّل وصولك</h3>
                <p>
                  تواصل معنا لتفعيل اشتراكك (فصل دراسي أو سنة كاملة)، أو لشراء
                  وحدة معينة إذا كنت في البكالوريا.
                </p>
              </div>
            </div>
            <div className="step-row">
              <div className="step-num">٣</div>
              <div className="step-text">
                <h3>شاهد وتعلم</h3>
                <p>
                  ادخل إلى لوحة التحكم وابدأ بمشاهدة الدروس المتاحة لك في
                  الرياضيات والفيزياء.
                </p>
              </div>
            </div>
            <div className="step-row">
              <div className="step-num">٤</div>
              <div className="step-text">
                <h3>اختبر نفسك</h3>
                <p>
                  بعد كل درس، أجب عن أسئلة الاختبار لتتأكد من أنك استوعبت الفكرة
                  قبل الانتقال للدرس التالي.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pricing" id="pricing">
        <div className="wrap">
          <div className="section-head">
            <div className="mini-seal">$</div>
            <h2>الأسعار</h2>
            <div className="rule"></div>
          </div>
          <div className="pricing-grid">
            <div className="price-card">
              <span className="tag">BEM</span>
              <h3>الرابعة متوسط</h3>
              <p className="p-desc">
                اشترِ كل مادة على حدة — السعر للسنة الدراسية كاملة في المادة
                الواحدة.
              </p>
              <div className="price-plan">
                <span className="p-label">الرياضيات  الفصل </span>
                <Price amount={4500} />
              </div>
              <div className="price-plan">
                <span className="p-label">الرياضيات — السنة كاملة</span>
                <Price amount={10000} old={13500} />
              </div>
               <div className="price-plan">
                <span className="p-label">الفيزياء  الفصل </span>
                <Price amount={3500} />
              </div>
              <div className="price-plan">
                <span className="p-label">الفيزياء — السنة كاملة</span>
                <Price amount={7000} old={10500} />
              </div>
              <div className="price-note">
                اختر الرياضيات أو الفيزياء أو كلتيهما معًا — كل مادة تُفعَّل
                برمز وصول خاص بها.
              </div>
            </div>

            <div className="price-card">
              <span className="tag">1AS · 2AS</span>
              <h3>الأولى ثانوي · الثانية ثانوي</h3>
              <p className="p-desc">
                اشتراك يفتح جميع دروس المستوى في الرياضيات والفيزياء.
              </p>
              <div className="price-plan">
                <span className="p-label">اشتراك فصل دراسي واحد</span>
                <Price amount={5000} />
              </div>
              <div className="price-plan">
                <span className="p-label">اشتراك السنة كاملة (3 فصول)</span>
                <Price amount={10000} old={15000} />
              </div>
              <SaveBar amount={10000} old={15000} />
              <div className="price-note">
                الدفع عبر التحويل البنكي أو بريدي موب — التفعيل يدوي بعد التأكد
                من الدفع.
              </div>
            </div>

            <div className="price-card">
              <span className="tag">BAC Gestion</span>
              <h3>البكالوريا تسيير و اقتصاد</h3>
              <p className="p-desc">
                اشترِ كل وحدة على حدة حسب حاجتك، أو كل الوحدات مرة واحدة.
              </p>
              <div className="price-plan">
                <span className="p-label">سعر الوحدة الواحدة</span>
                <Price amount={3000} />
              </div>
              <div className="price-plan">
                <span className="p-label">سعر كل الوحدات</span>
                <Price amount={15000} old={21000} />
              </div>
                            <SaveBar amount={15000} old={21000} />

              <div className="price-note">
                تُفتح كل وحدة فور تأكيد الدفع، وتبقى متاحة لك بلا مدة انتهاء.
              </div>
            </div>

            <div className="price-card">
              <span className="tag">BAC SC · MT · M</span>
              <h3>البكالوريا</h3>
              <p className="p-desc">
                اشترِ كل وحدة على حدة حسب حاجتك، أو كل الوحدات مرة واحدة.
              </p>
              <div className="price-plan">
                <span className="p-label">سعر الوحدة الواحدة</span>
                <Price amount={3000} />
              </div>
              <div className="price-plan">
                <span className="p-label">سعر كل الوحدات</span>
                <Price amount={15000} old={21000} />
              </div>
                                          <SaveBar amount={21000} old={15000} />

              <div className="price-note">
                تُفتح كل وحدة فور تأكيد الدفع، وتبقى متاحة لك بلا مدة انتهاء.
              </div>
            </div>

            <div className="price-card highlight">
              <div className="ribbon">الأكثر توفيرًا</div>
              <span className="tag">البوكس الالماسي</span>
              <h3>البكالوريا فيزياء و رياضيات</h3>
              <p className="p-desc">
                اشتراك يفتح جميع دروس المستوى في الرياضيات والفيزياء.
              </p>
              <div className="price-plan">
                <span className="p-label">اشتراك السنة كاملة — مادتين</span>
                <Price amount={20000} old={30000} />
              </div>
              <SaveBar amount={20000} old={30000} />
              <div className="price-note">
                الدفع عبر التحويل البنكي أو بريدي موب — التفعيل يدوي بعد التأكد
                من الدفع.
              </div>
            </div>
            <div className="price-card highlight">
              <div className="ribbon">الأكثر توفيرًا</div>
              <span className="tag">البوكس الالماسي</span>
              <h3>البكالوريا للشعب الادبية  </h3>
              <p className="p-desc">
                اشتراك يفتح جميع دروس المستوى  الرياضيات للادبيين .
              </p>
              <div className="price-plan">
                <span className="p-label">اشتراك السنة كاملة — مادتين</span>
                <Price amount={10000} old={15000} />
              </div>
              <SaveBar amount={10000} old={15000} />
              <div className="price-note">
                الدفع عبر التحويل البنكي أو بريدي موب — التفعيل يدوي بعد التأكد
                من الدفع.
              </div>
            </div>
            <div className="price-card highlight">
              <div className="ribbon">الأكثر توفيرًا</div>
              <span className="tag">البوكس الالماسي · BEM</span>
              <h3>الرابعة متوسط — المادتين</h3>
              <p className="p-desc">
                السعر للسنة الدراسية كاملة في الرياضيات والفيزياء معًا.
              </p>
              <div className="price-plan">
                <span className="p-label">الرياضيات و الفيزياء — السنة كاملة</span>
                <Price amount={14000} old={17000} />
              </div>
              <SaveBar amount={14000} old={17000} />
              <div className="price-note">
                تُفعَّل المادتان معًا برمز وصول واحد فور تأكيد الدفع.
              </div>

            </div>
          </div>
        </div>
      </section>

      <section className="contact" id="contact">
        <div className="wrap">
          <div className="section-head">
            <div className="mini-seal">@</div>
            <h2>تواصل معنا</h2>
            <div className="rule"></div>
          </div>
          <div className="contact-grid">
            <div className="contact-card">
              <div className="c-icon">☎</div>
              <div>
                <div className="c-label">هاتف / واتساب</div>
                <div className="c-value">0557740360</div>
              </div>
            </div>
            <div className="contact-card">
              <div className="c-icon">✉</div>
              <div>
                <div className="c-label">البريد الإلكتروني</div>
                <div className="c-value">contact@lmokh-platform.dz</div>
              </div>
            </div>
            <div className="contact-card">
              <div className="c-icon">📍</div>
              <div>
                <div className="c-label">الموقع</div>
                <div className="c-value">الجزائر</div>
              </div>
            </div>
            <div className="contact-card">
              <div className="c-icon">💬</div>
              <div>
                <div className="c-label">صفحة فيسبوك</div>
                <div className="c-value">facebook.com/lmokh.platform</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-band">
        <div className="wrap">
          <div className="sb-item">
            <div className="num">٢٠٠٧</div>
            <div className="lbl">وُلدت الفكرة تكريمًا لهذا الإرث</div>
          </div>
          <div className="sb-item">
            <div className="num">١٠٠٪</div>
            <div className="lbl">توافق مع المنهاج الرسمي</div>
          </div>
          <div className="sb-item">
            <div className="num">٢٤/٧</div>
            <div className="lbl">وصول للدروس في أي وقت</div>
          </div>
        </div>
      </section>

      <section className="final-cta" id="final">
        <div className="wrap">
          <h2>يوم النتائج قادم — لنستعد له معًا</h2>
          <p>انضم الآن وابدأ أول درس مجانًا، بلا التزام.</p>
          <Link to="/auth" className="btn-primary">
            أنشئ حسابك الآن
          </Link>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="f-logo">المخ</div>
          <div className="f-links">
            <a href="#about">قصتنا</a>
            <a href="#streams">الشعب</a>
            <a href="#features">المنصة</a>
          </div>
        </div>
        <div className="wrap f-bottom">
          إهداءً لكل أستاذ آمن بطلابه — © المخ 2026
        </div>
      </footer>
    </div>
  );
}
