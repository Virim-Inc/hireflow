import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import "../styles/login-page.css";

import { AnimatedBackground } from "@/components/shared/animated-background";
import { ShieldCheck } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Modern Login Page with GSAP-powered splash intro.
 *
 * Flow:
 *  1. "Hire Smartly" appears on screen
 *  2. Each letter of "Smartly" rolls upward (slot-machine style)
 *     to reveal "HireFlow" letter-by-letter
 *  3. Brief hold, then splash slides away
 *  4. Login form animates in
 */
export function LoginPage(_props: { onLogin?: (user: { id: number; email: string; name: string | null; role: string }) => void }) {
  const splashRef = useRef<HTMLDivElement>(null);
  const hireRef = useRef<HTMLSpanElement>(null);
  const dashRef = useRef<HTMLSpanElement>(null);
  const rollerContainerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const loginPageRef = useRef<HTMLDivElement>(null);

  const [showLogin, setShowLogin] = useState(false);

  /** Animate the login card + form fields in after splash exits */
  const animateLoginEntrance = useCallback(() => {
    setShowLogin(true);

    requestAnimationFrame(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        titleRef.current,
        { opacity: 0, y: -30 },
        { opacity: 1, y: 0, duration: 0.7 }
      );

      tl.fromTo(
        cardRef.current,
        { opacity: 0, y: 50, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8 },
        "-=0.3"
      );

      const formElements = cardRef.current?.querySelectorAll("[data-animate]");
      if (formElements && formElements.length > 0) {
        tl.fromTo(
          formElements,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.45, stagger: 0.08 },
          "-=0.4"
        );
      }
    });
  }, []);

  /** Main splash + rolling text animation */
  useEffect(() => {
    const splash = splashRef.current;
    const hire = hireRef.current;
    const rollerContainer = rollerContainerRef.current;
    if (!splash || !hire || !rollerContainer) return;

    // Get all the roller columns
    const columns =
      rollerContainer.querySelectorAll<HTMLDivElement>(".splash-col");

    const master = gsap.timeline({
      onComplete: () => {
        // Splash exit
        gsap.to(splash, {
          yPercent: -100,
          duration: 0.8,
          ease: "power3.inOut",
          onComplete: () => {
            splash.style.display = "none";
            animateLoginEntrance();
          },
        });
      },
    });

    // 1. Fade in "Hire" and all first-row chars together
    master.fromTo(
      hire,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
    );

    master.fromTo(
      columns,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.04, ease: "power3.out" },
      "-=0.4"
    );

    // 2. Hold "Hire Smartly" for a moment
    master.to({}, { duration: 0.8 });

    // 3. Roll each column: move the inner strip up by 50% so the
    //    second row (HireFlow chars) comes into view.
    //    Each column has 2 rows stacked vertically.
    const strips =
      rollerContainer.querySelectorAll<HTMLDivElement>(".splash-col-strip");

    master.to(strips, {
      yPercent: -50,
      duration: 0.6,
      ease: "power3.inOut",
      stagger: {
        each: 0.05,
        from: "random",
      },
    });

    // 4. Hold "HireFlow" for a moment
    master.to({}, { duration: 0.8 });

    return () => {
      master.kill();
    };
  }, [animateLoginEntrance]);

  const [devLoading, setDevLoading] = useState(false);

  const handleDevLogin = async () => {
    try {
      setDevLoading(true);
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Dev login failed');
      const data = await res.json();
      localStorage.setItem('hf_token', data.token);
      if (_props.onLogin) {
        _props.onLogin(data.user);
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error('Local dev login error:', err);
    } finally {
      setDevLoading(false);
    }
  };

  const handlePmsLogin = () => {
    window.location.href = import.meta.env.VITE_PMS_LOGIN_URL;
  };

  // The first word shown, and the word it rolls into
  const fromWord = "Smartly.";
  const toWord = "HireFlow";

  // Pad shorter word to match lengths
  const maxLen = Math.max(fromWord.length, toWord.length);
  const fromChars = fromWord.padEnd(maxLen, " ").split("");
  const toChars = toWord.padEnd(maxLen, " ").split("");

  return (
    <div ref={loginPageRef} className="login-page">
      {/* Animated background — always visible */}
      <AnimatedBackground orbCount={5} particleCount={35} showGrid />

      {/* ========== SPLASH INTRO ========== */}
      <div ref={splashRef} className="splash-overlay">
        <div className="splash-text-row">
          {/* Static "Hire" */}
          <span ref={hireRef} className="splash-hire" style={{ opacity: 0 }}>
            Hire
          </span>

          {/* Dash separator */}
          <span ref={dashRef} className="splash-dash">—</span>

          {/* Rolling character columns */}
          <div ref={rollerContainerRef} className="splash-roller-row">
            {fromChars.map((fromChar, i) => (
              <div key={i} className="splash-col" style={{ opacity: 0 }}>
                {/* Strip: two rows stacked, overflow hidden on parent */}
                <div className="splash-col-strip">
                  {/* Row 1: "Smartly." char */}
                  <span className="splash-char splash-char--from">
                    {fromChar}
                  </span>
                  {/* Row 2: "HireFlow" char */}
                  <span className="splash-char splash-char--to">
                    {toChars[i]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========== LOGIN CONTENT ========== */}
      {showLogin && (
        <div className="login-content">
          <div ref={titleRef} className="login-brand" style={{ opacity: 0 }}>
            <div className="login-brand-icon">
              <ShieldCheck
                className="login-icon-pulse"
                size={36}
                strokeWidth={1.5}
              />
            </div>
            <h1 className="login-brand-title">HireFlow</h1>
            <p className="login-brand-subtitle">
              Intelligent Hiring Automation
            </p>
          </div>

          <div
            ref={cardRef}
            className="login-card-wrapper"
            style={{ opacity: 0 }}
          >
            <Card className="login-card">
              <CardHeader className="login-card-header">
                <CardTitle className="login-card-title">Welcome back</CardTitle>
                <CardDescription className="login-card-desc">
                  Sign in to your account to continue
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div
                  className="login-field"
                  data-animate
                  style={{ textAlign: "center", padding: "10px 0" }}
                >
                  <p style={{ color: "#9ca3af", fontSize: "14px", lineHeight: "1.6", marginBottom: "20px" }}>
                    Production authentication is managed through the Project Management System (PMS) Portal.
                  </p>
                  <Button
                    type="button"
                    onClick={handlePmsLogin}
                    className="login-submit"
                    size="lg"
                    style={{ width: "100%" }}
                  >
                    Login via PMS Portal
                  </Button>

                  {import.meta.env.DEV && (
                    <Button
                      type="button"
                      onClick={handleDevLogin}
                      variant="outline"
                      disabled={devLoading}
                      size="lg"
                      style={{
                        width: "100%",
                        marginTop: "12px",
                        borderColor: "#6366f1",
                        color: "#6366f1",
                        fontWeight: 700,
                        background: "rgba(99, 102, 241, 0.05)",
                        cursor: "pointer",
                      }}
                    >
                      {devLoading ? "Logging in..." : "⚡ 1-Click Local Dev Login (Bypass SSO)"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
