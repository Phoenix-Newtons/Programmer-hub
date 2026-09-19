import { Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Layout from "./components/layout/Layout";
import ErrorBoundary from "./components/feedback/ErrorBoundary";
import { PageLoader } from "./components/ui/Skeletons";
import { lazyPage } from "./lib/pages";

// Route-level code splitting: each page is fetched on demand (see lib/pages.js,
// which also powers the hover prefetching in the navigation).
const Home = lazyPage("Home");
const Developers = lazyPage("Developers");
const DeveloperProfile = lazyPage("DeveloperProfile");
const Projects = lazyPage("Projects");
const Hiring = lazyPage("Hiring");
const Shortlist = lazyPage("Shortlist");
const About = lazyPage("About");
const Login = lazyPage("Login");
const Dashboard = lazyPage("Dashboard");
const NotFound = lazyPage("NotFound");

/**
 * Every route is wrapped in its own error boundary, so a crash in one screen
 * never takes down the navigation, footer or command palette.
 */
const ROUTES = [
  { path: "/", label: "Loading hub…", element: <Home /> },
  { path: "/developers", label: "Loading developers…", element: <Developers /> },
  { path: "/developers/:id", label: "Loading profile…", element: <DeveloperProfile /> },
  { path: "/projects", label: "Loading projects…", element: <Projects /> },
  { path: "/hiring", label: "Loading hiring board…", element: <Hiring /> },
  { path: "/shortlist", label: "Loading shortlist…", element: <Shortlist /> },
  { path: "/about", label: "Loading about…", element: <About /> },
  { path: "/login", label: "Loading sign in…", element: <Login /> },
  { path: "/dashboard", label: "Loading dashboard…", element: <Dashboard /> },
  { path: "*", label: "Loading…", element: <NotFound /> },
];

export default function App() {
  const location = useLocation();

  // Move focus to the main region on navigation for keyboard users.
  useEffect(() => {
    const main = document.getElementById("main");
    if (main && (document.activeElement === document.body || document.activeElement === null)) {
      main.focus({ preventScroll: true });
    }
  }, [location.pathname]);

  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<Layout />}>
          {ROUTES.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={
                <ErrorBoundary title="This screen hit an error">
                  <Suspense fallback={<PageLoader label={route.label} />}>{route.element}</Suspense>
                </ErrorBoundary>
              }
            />
          ))}
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
