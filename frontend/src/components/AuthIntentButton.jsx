import { SignInButton, SignUpButton } from "@clerk/clerk-react";
import { useRuntimeAuth } from "../hooks/useRuntimeAuth";
import { setAuthIntent } from "../lib/authIntent";

function AuthIntentButton({
  role,
  action = "signin",
  className = "",
  children,
  type = "button",
}) {
  const { authMode, signInAs } = useRuntimeAuth();
  const normalizedRole = role === "teacher" ? "teacher" : "student";

  const handleIntent = () => {
    setAuthIntent(normalizedRole);
  };

  if (authMode === "dev") {
    return (
      <button
        type={type}
        className={className}
        onClick={() => {
          handleIntent();
          signInAs(normalizedRole);
        }}
      >
        {children}
      </button>
    );
  }

  const Wrapper = action === "signup" ? SignUpButton : SignInButton;

  return (
    <div onClickCapture={handleIntent}>
      <Wrapper mode="modal">
        <button type={type} className={className}>
          {children}
        </button>
      </Wrapper>
    </div>
  );
}

export default AuthIntentButton;
