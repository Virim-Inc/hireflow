import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import "../styles/login-page.css";

import { AnimatedBackground } from "@/components/shared/animated-background";
import { Mail, Lock, ShieldCheck } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

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
export function LoginPage({ onLogin }: { onLogin?: () => void }) {
  const splashRef = useRef<HTMLDivElement>(null);
  const hireRef = useRef<HTMLSpanElement>(null);
  const dashRef = useRef<HTMLSpanElement>(null);
  const rollerContainerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const loginPageRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(false);
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

      const formElements = formRef.current?.querySelectorAll("[data-animate]");
      if (formElements) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLogin?.();
    }, 1500);
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
                <form
                  ref={formRef}
                  onSubmit={handleSubmit}
                  className="login-form"
                >
                  <div
                    className="login-field"
                    data-animate
                    style={{ opacity: 0 }}
                  >
                    <Label htmlFor="login-email" className="login-label">
                      <Mail
                        className="login-icon-float"
                        size={16}
                        strokeWidth={2}
                      />
                      Email Address
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@company.com"
                      required
                      autoComplete="email"
                      className="login-input"
                    />
                  </div>

                  <div
                    className="login-field"
                    data-animate
                    style={{ opacity: 0 }}
                  >
                    <Label htmlFor="login-password" className="login-label">
                      <Lock
                        className="login-icon-wiggle"
                        size={16}
                        strokeWidth={2}
                      />
                      Password
                    </Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="login-input"
                    />
                  </div>

                  <div
                    className="login-options"
                    data-animate
                    style={{ opacity: 0 }}
                  >
                    <div className="login-remember">
                      <Checkbox id="login-remember" />
                      <Label
                        htmlFor="login-remember"
                        className="login-remember-label"
                      >
                        Remember me
                      </Label>
                    </div>
                    <a href="#" className="login-forgot">
                      Forgot password?
                    </a>
                  </div>

                  <div data-animate style={{ opacity: 0 }}>
                    <Button
                      type="submit"
                      className="login-submit"
                      size="lg"
                      disabled={isLoading}
                    >
                      {isLoading ? <span className="login-spinner" /> : null}
                      {isLoading ? "Signing in…" : "Sign In"}
                    </Button>
                  </div>

                  <div
                    className="login-divider"
                    data-animate
                    style={{ opacity: 0 }}
                  >
                    <span className="login-divider-line" />
                    <span className="login-divider-text">or continue with</span>
                    <span className="login-divider-line" />
                  </div>

                  <div
                    className="login-social"
                    data-animate
                    style={{ opacity: 0 }}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      className="login-social-btn"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        aria-hidden="true"
                      >
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Google
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="login-social-btn"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                      GitHub
                    </Button>
                  </div>

                  <p
                    className="login-signup"
                    data-animate
                    style={{ opacity: 0 }}
                  >
                    Don't have an account?{" "}
                    <a href="#" className="login-signup-link">
                      Create one
                    </a>
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
