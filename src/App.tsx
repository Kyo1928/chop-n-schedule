import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import AuthPage from "./pages/Auth";
import TasksPage from "./pages/Tasks";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AuthProvider } from "./components/auth/AuthProvider";
import { ThemeProvider } from "./hooks/use-theme";
import { SidebarProvider } from "./components/ui/sidebar";
import { AppSidebar } from "./components/layout/AppSidebar";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <SidebarProvider>
            <div className="flex min-h-screen w-full">
              <AppSidebar />
              <main className="flex-1">
                <Routes>
                  <Route path="/auth" element={<AuthPage />} />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <TasksPage />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </main>
            </div>
          </SidebarProvider>
          <Toaster />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;