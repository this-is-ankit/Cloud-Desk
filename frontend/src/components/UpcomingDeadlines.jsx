import { format, formatDistanceToNowStrict } from "date-fns";
import {
  AlertCircleIcon,
  CalendarIcon,
  RadioTowerIcon,
} from "./icons/ModernIcons";

function UpcomingDeadlines({
  title,
  subtitle,
  items = [],
  emptyLabel,
  emptyHint,
}) {
  return (
    <div className="h-full rounded-[2rem] border border-base-content/10 bg-base-100 p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="mt-1 text-sm text-base-content/60">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => {
            const date = item.date ? new Date(item.date) : null;
            const urgent = date
              ? date.getTime() - Date.now() <= 1000 * 60 * 60 * 48
              : false;

            return (
              <div
                key={item.id}
                className={`rounded-[1.4rem] border p-4 ${urgent ? "border-error/20 bg-error/10" : "border-base-content/10 bg-base-200/35"}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 ${urgent ? "text-error" : "text-base-content/50"}`}
                  >
                    {item.kind === "live" ? (
                      <RadioTowerIcon className="w-5 h-5" />
                    ) : urgent ? (
                      <AlertCircleIcon className="w-5 h-5" />
                    ) : (
                      <CalendarIcon className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-base-content">
                      {item.title}
                    </h4>
                    <p className="text-xs font-medium opacity-70 mt-0.5">
                      {item.courseTitle}
                    </p>
                    {date && (
                      <div
                        className={`mt-2 text-sm font-medium ${urgent ? "text-error" : "text-base-content/60"}`}
                      >
                        {item.kind === "live"
                          ? `${format(date, "MMM d, p")} • starts in ${formatDistanceToNowStrict(date)}`
                          : `Due in ${formatDistanceToNowStrict(date)}`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-[1.6rem] border border-dashed border-base-content/15 bg-base-200/35 p-6 text-center">
            <p className="font-semibold text-base-content/80">{emptyLabel}</p>
            <p className="mt-2 text-sm text-base-content/55">{emptyHint}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default UpcomingDeadlines;
