import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Devoirs from "./pages/Devoirs";
import Notes from "./pages/Notes";
import EDT from "./pages/EDT";
import Admin from "./pages/Admin";
import Profil from "./pages/Profil";
import Documents from "./pages/Documents";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";

function PrivateRoute({ children }) {
  const { token } = useAuth();
  const location = useLocation();
  if (token) return children;
  const retour = encodeURIComponent(location.pathname + location.search);
  return <Navigate to={`/login?from=${retour}`} replace />;
}

// Le paramètre `from` vient de l'URL, donc de n'importe qui. Plutôt qu'une liste de formes
// interdites ("//site.com", "/\site.com"...), on laisse le navigateur l'interpréter comme il le
// ferait lui-même, et on ne garde le résultat que s'il reste sur notre origine.
function cheminRetour(search) {
  const from = new URLSearchParams(search).get("from");
  if (!from?.startsWith("/")) return "/dashboard";
  const url = new URL(from, window.location.origin);
  return url.origin === window.location.origin ? url.pathname + url.search : "/dashboard";
}

// Pages réservées aux visiteurs : une fois connecté, c'est ici que se décide la destination
function PublicRoute({ children }) {
  const { token } = useAuth();
  const location = useLocation();
  return token ? <Navigate to={cheminRetour(location.search)} replace /> : children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/devoirs"
              element={
                <PrivateRoute>
                  <Devoirs />
                </PrivateRoute>
              }
            />
            <Route
              path="/notes"
              element={
                <PrivateRoute>
                  <Notes />
                </PrivateRoute>
              }
            />
            <Route
              path="/edt"
              element={
                <PrivateRoute>
                  <EDT />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <PrivateRoute>
                  <Admin />
                </PrivateRoute>
              }
            />
            <Route
              path="/profil"
              element={
                <PrivateRoute>
                  <Profil />
                </PrivateRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <PrivateRoute>
                  <Documents />
                </PrivateRoute>
              }
            />
            {/* Les anciennes notifications d'annonce pointent encore vers /chat */}
            <Route path="/chat" element={<Navigate to="/dashboard" replace />} />
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
