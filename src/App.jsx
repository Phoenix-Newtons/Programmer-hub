import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import Layout from "./components/layout/Layout";
import { PageLoader } from "./components/ui/Skeletons";

// Route-level code splitting: each page is fetched on demand.
const Home = lazy(() => import("./pages/Home"));
const Developers = lazy(() => import("./pages/Developers"));
const DeveloperProfile = lazy(() => import("./pages/DeveloperProfile"));
const Projects = lazy(() => import("./pages/Projects"));
const Hiring = lazy(() => import("./pages/Hiring"));
const About = lazy(() => import("./pages/About"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route
          path="/"
          element={
            <Suspense fallback={<PageLoader label="Loading hub…" />}>
              <Home />
            </Suspense>
          }
        />
        <Route
          path="/developers"
          element={
            <Suspense fallback={<PageLoader label="Loading developers…" />}>
              <Developers />
            </Suspense>
          }
        />
        <Route
          path="/developers/:id"
          element={
            <Suspense fallback={<PageLoader label="Loading profile…" />}>
              <DeveloperProfile />
            </Suspense>
          }
        />
        <Route
          path="/projects"
          element={
            <Suspense fallback={<PageLoader label="Loading projects…" />}>
              <Projects />
            </Suspense>
          }
        />
        <Route
          path="/hiring"
          element={
            <Suspense fallback={<PageLoader label="Loading hiring board…" />}>
              <Hiring />
            </Suspense>
          }
        />
        <Route
          path="/about"
          element={
            <Suspense fallback={<PageLoader label="Loading about…" />}>
              <About />
            </Suspense>
          }
        />
        <Route
          path="/login"
          element={
            <Suspense fallback={<PageLoader label="Loading sign in…" />}>
              <Login />
            </Suspense>
          }
        />
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={<PageLoader label="Loading dashboard…" />}>
              <Dashboard />
            </Suspense>
          }
        />
        <Route
          path="*"
          element={
            <Suspense fallback={<PageLoader />}>
              <NotFound />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}
