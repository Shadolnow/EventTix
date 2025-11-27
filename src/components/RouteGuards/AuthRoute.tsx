import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";

interface AuthRouteProps {
  children: ReactNode;
}

const AuthRoute = ({ children }: AuthRouteProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      toast.error("Please sign in to access this page");
      navigate("/auth");
    }
  }, [user, navigate]);

  if (!user) return null;
  return <>{children}</>;
};

export default AuthRoute;