import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

/**
 * A password field with a show/hide toggle.
 *
 * Typing a password into a masked field and getting it wrong is the single most common way people
 * get locked out of an account they own, and the cost of the fix — a reset email, a code, a wait —
 * is far higher than the cost of a glance. So the toggle belongs on every field where a human is
 * *choosing* a password, not just on sign-in.
 *
 * Renders as a fragment rather than a wrapper because it has to sit inside `AuthField`'s bordered
 * box alongside the leading icon. The toggle is `type="button"` so it can never submit the form,
 * and focus returns to the input afterwards so a keyboard user is not dropped at the end of the
 * field.
 *
 * Focus is restored by id rather than by a ref on purpose: `register()` returns its own `ref`, and
 * spreading it after a local `ref` would silently drop the hook-form registration and the field
 * would stop validating at all.
 */
export function PasswordInput({ id, register, field, error, autoComplete, placeholder = "Minimum 8 characters", onToggle }) {
  const [revealed, setRevealed] = useState(false);

  function toggle() {
    setRevealed((current) => !current);
    onToggle?.();
    if (typeof document !== "undefined") {
      document.getElementById(id)?.focus();
    }
  }

  return (
    <>
      <input
        id={id}
        {...register(field)}
        type={revealed ? "text" : "password"}
        className="auth-input"
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={revealed ? "Hide password" : "Show password"}
        aria-pressed={revealed}
        title={revealed ? "Hide password" : "Show password"}
        className="-mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-subtle transition hover:bg-blue-50 hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
      >
        {revealed ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </>
  );
}