import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { ApiError } from "@/api/http";
import { Button } from "@/components/ui/Button";
import { t } from "@/lib/strings";
import { homePathFor } from "@/routes/paths";
import { AuthLayout } from "./AuthLayout";
import { useAuth } from "./useAuth";

const schema = z.object({
  email: z.string().trim().min(1, "Enter your email").email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});
type FormValues = z.infer<typeof schema>;

/** Phase 0 login so the shell can be reached. Phase 1 adds the remaining account pages and polish. */
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const user = await login(values);
      navigate(from && from !== "/login" ? from : homePathFor(user.type), { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setServerError(t.auth.badCredentials);
      else setServerError(error instanceof Error ? error.message : t.errors.generic);
    }
  });

  return (
    <AuthLayout>
      <form
        onSubmit={onSubmit}
        noValidate
        className="w-full max-w-[440px] rounded-card border border-border bg-surface p-8 shadow-[0_8px_24px_rgb(30_36_39/0.06)] sm:p-10"
      >
        <h1 className="text-[28px] font-bold">{t.auth.loginTitle}</h1>
        <p className="mt-2 text-[15px] text-ink-2">{t.auth.loginIntro}</p>

        {serverError && (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-bad/30 bg-bad-tint px-4 py-3 text-sm text-bad"
          >
            {serverError}
          </p>
        )}

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">{t.auth.email}</span>
            <span className="flex h-11 items-center gap-2.5 rounded-control border border-border-strong bg-surface px-3.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
              <Mail className="size-[18px] text-ink-muted" aria-hidden />
              <input
                type="email"
                autoComplete="username"
                placeholder="name@aum.edu.jo"
                className="h-full flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-muted"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
            </span>
            {errors.email && <span className="mt-1 block text-[13px] text-bad">{errors.email.message}</span>}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">{t.auth.password}</span>
            <span className="flex h-11 items-center gap-2.5 rounded-control border border-border-strong bg-surface px-3.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
              <Lock className="size-[18px] text-ink-muted" aria-hidden />
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                className="h-full flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-muted"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
            </span>
            {errors.password && (
              <span className="mt-1 block text-[13px] text-bad">{errors.password.message}</span>
            )}
          </label>
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm font-semibold text-brand hover:underline">
              {t.auth.forgot}
            </Link>
          </div>
        </div>

        <Button type="submit" className="mt-6 w-full" disabled={isSubmitting}>
          {isSubmitting ? t.auth.submitting : t.auth.submit}
        </Button>
      </form>
    </AuthLayout>
  );
}
