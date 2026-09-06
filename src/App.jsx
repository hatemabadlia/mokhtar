import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LmokhLanding from './components/LmokhLanding';
import Auth from './components/Auth';
import DashboardLayout from './components/dashboard/DashboardLayout';
import Home from './components/dashboard/Home';
import DashboardLessons from './components/dashboard/DashboardLessons';
import Progress from './components/dashboard/Progress';
import Live from './components/dashboard/Live';
import Quiz from './components/dashboard/Quiz';
import Exams from './components/dashboard/Exams';
import Profile from './components/dashboard/Profile';

import RequireAuth from './components/RequireAuth';
import Onboarding from './components/Onboarding';

// واجهة المتعلّم — المكتبة والمشاهدة (محمية بتسجيل الدخول)
import LevelLessonsPage from './components/lessons/LevelLessonsPage';
import WatchLesson from './components/lessons/WatchLesson';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* الصفحة الرئيسية — الصفحة التسويقية (بلا تسجيل دخول) */}
        <Route path="/" element={<LmokhLanding />} />

        {/* الدروس والمشاهدة — فقط بعد تسجيل الدخول */}
        <Route
          path="/level/:level"
          element={
            <RequireAuth>
              <LevelLessonsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/watch/:id"
          element={
            <RequireAuth>
              <WatchLesson />
            </RequireAuth>
          }
        />

        {/* المصادقة واختيار المستوى (السنة) */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/signup" element={<Auth />} />
        {/* لوحة التحكم — كل الخدمات بعد تسجيل الدخول */}
        <Route path="/app" element={<DashboardLayout />}>
          <Route index element={<Home />} />
          <Route path="lessons" element={<DashboardLessons />} />
          <Route path="progress" element={<Progress />} />
          <Route path="live" element={<Live />} />
          <Route path="quiz" element={<Quiz />} />
          <Route path="exams" element={<Exams />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* إعداد الحساب — اختيار المستوى (السنة) بعد تسجيل الدخول */}
        <Route
          path="/onboarding"
          element={
            <RequireAuth>
              <Onboarding />
            </RequireAuth>
          }
        />
        {/* keep /level as a redirect for any old links/bookmarks */}
        <Route path="/level" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    </BrowserRouter>
  );
}