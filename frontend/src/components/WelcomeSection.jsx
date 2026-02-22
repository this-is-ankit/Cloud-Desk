import { useUser } from "@clerk/clerk-react";
import { ArrowRightIcon, SparklesIcon, ZapIcon } from "./icons/ModernIcons";

function WelcomeSection({ onCreateSession }) {
  const { user } = useUser();

  return (
    <div className="relative overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="icon-box w-12 h-12">
                <SparklesIcon className="w-6 h-6 text-base-content" />
              </div>
              <h1 className="text-5xl font-black text-primary">
                Welcome back, {user?.firstName || "there"}!
              </h1>
            </div>
            <p className="text-xl text-base-content/60 ml-16">
              Ready to level up your coding skills?
            </p>
          </div>
          <button
            onClick={onCreateSession}
            className="btn btn-primary btn-sm rounded-none px-4"
          >
            <ZapIcon className="size-4" />
            <span>Create Session</span>
            <ArrowRightIcon className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default WelcomeSection;
