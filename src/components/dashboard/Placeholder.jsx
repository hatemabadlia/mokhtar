import React from 'react';
import { Link } from 'react-router-dom';

export default function Placeholder({ 
  icon = '📌', 
  code = 'N/A', 
  title = 'العنوان', 
  description = '', 
  items = [] 
}) {
  return (
    <div className="ph">
      <style>{`
        .ph {
          min-height: calc(100vh - 88px);
          min-height: calc(100dvh - 88px);
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 16px;
          box-sizing: border-box;
        }
        .ph-card {
          max-width: 520px;
          width: 100%;
          text-align: center;
          background: #fffdf6;
          border: 1.5px solid var(--line, #e2d9c8);
          border-radius: 22px;
          padding: 46px 36px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03);
          box-sizing: border-box;
        }
        .ph-icon {
          width: 74px;
          height: 74px;
          border-radius: 20px;
          margin: 0 auto 18px;
          background: var(--ink-teal, #134e4a);
          color: var(--gold-bright, #f59e0b);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
        }
        .ph-code {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.18em;
          color: var(--gold, #d97706);
          display: block;
        }
        .ph-card h1 {
          font-family: 'Aref Ruqaa', serif;
          font-size: 28px;
          color: var(--ink-teal, #134e4a);
          margin: 10px 0;
          font-weight: 700;
        }
        .ph-desc {
          font-size: 14.5px;
          color: #5c584c;
          line-height: 1.8;
          margin-bottom: 22px;
        }
        .ph-items {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: center;
          margin-bottom: 26px;
        }
        .ph-item {
          font-size: 12px;
          font-weight: 600;
          color: #7a5612;
          background: rgba(227, 162, 60, 0.14);
          border-radius: 999px;
          padding: 6px 14px;
        }
        .ph-soon {
          display: inline-block;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.14em;
          color: var(--crimson, #b23a2e);
          border: 1px dashed rgba(178, 58, 46, 0.5);
          border-radius: 999px;
          padding: 8px 20px;
          margin-bottom: 24px;
        }
        .ph-back {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 700;
          color: var(--ink-teal, #134e4a);
          padding: 12px 26px;
          border-radius: 999px;
          border: 1.5px solid var(--ink-teal, #134e4a);
          text-decoration: none;
          transition: all 0.25s ease;
        }
        .ph-back:hover {
          background: var(--ink-teal, #134e4a);
          color: var(--parchment, #fefbc8);
        }
      `}</style>

      <div className="ph-card">
        <div className="ph-icon">{icon}</div>
        <span className="ph-code">{code}</span>
        <h1>{title}</h1>
        {description && <p className="ph-desc">{description}</p>}
        
        {items.length > 0 && (
          <div className="ph-items">
            {items.map((it, idx) => (
              <span key={idx} className="ph-item">◆ {it}</span>
            ))}
          </div>
        )}

        <div className="ph-soon">قريبًا — قيد التطوير</div>
        <div>
          <Link to="/app" className="ph-back">← العودة للرئيسية</Link>
        </div>
      </div>
    </div>
  );
}