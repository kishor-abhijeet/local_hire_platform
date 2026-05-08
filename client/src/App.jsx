import { Navigate, Route, Routes } from "react-router-dom";
import Footer from "./components/Footer.jsx";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import EmployerDashboard from "./pages/EmployerDashboard.jsx";
import Home from "./pages/Home.jsx";
import JobDetails from "./pages/JobDetails.jsx";
import Jobs from "./pages/Jobs.jsx";
import Login from "./pages/Login.jsx";
import NotFound from "./pages/NotFound.jsx";
import PostJob from "./pages/PostJob.jsx";
import Register from "./pages/Register.jsx";
import SeekerDashboard from "./pages/SeekerDashboard.jsx";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetails />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/post-job"
            element={
              <ProtectedRoute roles={["employer", "admin"]}>
                <PostJob />
              </ProtectedRoute>
            }
          />
          <Route
            path="/post-job/:id/edit"
            element={
              <ProtectedRoute roles={["employer", "admin"]}>
                <PostJob />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/dashboard"
            element={
              <ProtectedRoute roles={["employer", "admin"]}>
                <EmployerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seeker/dashboard"
            element={
              <ProtectedRoute roles={["jobseeker", "admin"]}>
                <SeekerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/dashboard" element={<Navigate to="/seeker/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
