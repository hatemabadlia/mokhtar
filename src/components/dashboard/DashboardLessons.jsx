import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { normalizeLessonsLevel } from '../../data/platform';
import LessonsContent from '../lessons/LessonsContent';

/**
 * قسم «الدروس» داخل لوحة التحكم — /app/lessons
 * يعرض دروس المستوى المحفوظ للمستخدم داخل إطار اللوحة
 * (القائمة الجانبية + الشريط العلوي تبقى ظاهرة).
 */
export default function DashboardLessons() {
  const { level } = useOutletContext();
  const lessonsLevel = normalizeLessonsLevel(level);

  if (!lessonsLevel) {
    return (
      <div className="dl-choose" dir="rtl">
        <style>{`
          .dl-choose{min-height:calc(100svh - 88px);display:flex;align-items:center;justify-content:center;padding:40px 16px;box-sizing:border-box;}
          .dl-card{max-width:480px;width:100%;text-align:center;background:#fffdf6;border:1.5px solid rgba(28,26,21,0.14);border-radius:22px;padding:44px 30px;box-shadow:0 10px 30px rgba(0,0,0,0.03);box-sizing:border-box;}
          .dl-ico{width:70px;height:70px;border-radius:20px;margin:0 auto 16px;background:var(--ink-teal,#0E3B36);color:var(--gold-bright,#F0B85C);display:flex;align-items:center;justify-content:center;font-size:34px;}
          .dl-card h2{font-family:'Aref Ruqaa',serif;font-size:25px;color:var(--ink-teal,#0E3B36);margin:0 0 8px;font-weight:700;}
          .dl-card p{font-size:14px;color:#5c584c;line-height:1.8;margin:0 0 22px;}
          .dl-btn{display:inline-flex;align-items:center;gap:8px;background:var(--crimson,#B23A2E);color:var(--parchment,#F6EEDC);font-weight:700;font-size:14px;padding:12px 28px;border-radius:999px;}
        `}</style>
        <div className="dl-card">
          <div className="dl-ico">📚</div>
          <h2>اختر مستواك أولًا</h2>
          <p>لبدء الدروس، حدّد مستواك الدراسي (BEM · 1AS · 2AS · BAC) وسنعرض لك دروسه مرتبة حسب الفصول أو الوحدات.</p>
          <Link className="dl-btn" to="/app/profile">
            اختر مستواك الآن
          </Link>
        </div>
      </div>
    );
  }

  return <LessonsContent level={lessonsLevel} embedded />;
}