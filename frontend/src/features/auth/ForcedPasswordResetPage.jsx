import { joiResolver } from "@hookform/resolvers/joi";
import Joi from "joi";
import { LockKeyhole, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext.jsx";
import { useCustomer } from "../../context/CustomerContext.jsx";
import { changeBusinessPassword } from "../../services/authApi.js";
import { changeCustomerPassword } from "../../services/customerAuthApi.js";
import { AuthAlert, AuthField, AuthLayout, AuthSubmit } from "./AuthLayout.jsx";
import { PasswordInput } from "./PasswordInput.jsx";
import { getApiErrorMessage } from "../../services/apiError.js";

const schema = Joi.object({
  currentPassword: Joi.string().required().label("Current password"),
  newPassword: Joi.string().min(8).required().label("New password"),
  confirmPassword: Joi.string().required().valid(Joi.ref("newPassword")).label("Confirm password").messages({
    "any.only": "Passwords do not match.",
  }),
});

/**
 * Shown when the API reports `password_reset_required`, which happens when a
 * sign-in succeeds with a password that fails the current strength policy. The
 * account stays blocked from every other endpoint until this form succeeds.
 */
export function ForcedPasswordResetPage({ customer = false }) {
  const navigate = useNavigate();
  const auth = useAuth();
  const customerSession = useCustomer();
  const [serverError, setServerError] = useState("");
  const form = useForm({
    resolver: joiResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function submit(values) {
    setServerError("");
    const payload = { currentPassword: values.currentPassword, newPassword: values.newPassword };
    try {
      if (customer) {
        const session = await changeCustomerPassword(payload);
        customerSession.setCustomerSession(session);
        navigate("/customer/marketplace", { replace: true });
        return;
      }
      const session = await changeBusinessPassword(payload);
      auth.setSession(session);
      // Owners and cashiers both land here after an owner-issued password reset, so
      // send each one back to their own workspace.
      navigate(session.user?.accountType === "cashier" ? "/cashier" : "/dashboard", { replace: true });
    } catch (error) {
      setServerError(getApiErrorMessage(error, "Could not update your password."));
    }
  }

  return (
    <AuthLayout
      audience={customer ? "customer" : "business"}
      icon={ShieldAlert}
      title="Choose a new password"
      subtitle="Use at least 8 characters with three of: lowercase, uppercase, number, symbol. Avoid common passwords and anything containing your name, email or phone number."
    >
      <AuthAlert tone="orange">
        Your current password does not meet the security requirements for this account. Set a stronger
        one to regain access.
      </AuthAlert>

      <AuthAlert tone="red">{serverError}</AuthAlert>

      <form className="space-y-4" onSubmit={form.handleSubmit(submit)} noValidate>
        <AuthField icon={<LockKeyhole size={17} />} label="Current password" htmlFor="currentPassword" error={form.formState.errors.currentPassword?.message}>
          <PasswordInput id="currentPassword" register={form.register} field="currentPassword" error={form.formState.errors.currentPassword} autoComplete="current-password" placeholder="Your existing password" />
        </AuthField>
        <AuthField icon={<LockKeyhole size={17} />} label="New password" htmlFor="newPassword" error={form.formState.errors.newPassword?.message}>
          <PasswordInput id="newPassword" register={form.register} field="newPassword" error={form.formState.errors.newPassword} autoComplete="new-password" />
        </AuthField>
        <AuthField icon={<LockKeyhole size={17} />} label="Confirm new password" htmlFor="confirmPassword" error={form.formState.errors.confirmPassword?.message}>
          <PasswordInput id="confirmPassword" register={form.register} field="confirmPassword" error={form.formState.errors.confirmPassword} autoComplete="new-password" placeholder="Re-enter new password" />
        </AuthField>
        <AuthSubmit isSubmitting={form.formState.isSubmitting}>Update password and continue</AuthSubmit>
      </form>

      <div className="mt-5 border-t border-line-soft pt-5 text-center text-sm text-muted">
        Forgot your current password?{" "}
        <button
          type="button"
          className="font-bold text-brand hover:text-brand-hover"
          onClick={() => {
            if (customer) {
              customerSession.clearCustomerSession();
              navigate("/customer/forgot-password", { replace: true });
              return;
            }
            auth.clearSession();
            navigate("/forgot-password", { replace: true });
          }}
        >
          Reset it with a code
        </button>
      </div>
    </AuthLayout>
  );
}
