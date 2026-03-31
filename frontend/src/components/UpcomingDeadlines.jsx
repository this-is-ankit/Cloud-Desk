import { AlertCircle, Calendar, RadioTower } from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";

function UpcomingDeadlines({ title, subtitle, items = [], emptyLabel, emptyHint }) {
  return (
    <div className="bg-base-100/50 backdrop-blur-xl border border-base-content/10 rounded-3xl p-6 h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-sm text-base-content/60">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => {
            const date = item.date ? new Date(item.date) : null;
            const urgent = date ? date.getTime() - Date.now() <= 1000 * 60 * 60 * 48 : false;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border ${urgent ? "border-none bg-danger/10" : "border-base-content/10 bg-base-100/50"}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${urgent ? "text-danger" : "text-base-content/50"}`}>
                    {item.kind === "live" ? (
                      <RadioTower className="w-5 h-5" />
                    ) : urgent ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      <Calendar className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className={`font-semibold ${urgent ? "text-danger-content" : ""}`}>{item.title}</h4>
                    <p className="text-xs font-medium opacity-70 mt-0.5">{item.courseTitle}</p>
                    {date && (
                      <div className={`text-sm mt-2 font-medium ${urgent ? "text-danger" : "text-base-content/60"}`}>
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
          <div className="rounded-2xl border border-dashed border-base-content/15 bg-base-100/40 p-6 text-center">
            <p className="font-semibold text-base-content/80">{emptyLabel}</p>
            <p className="mt-2 text-sm text-base-content/55">{emptyHint}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default UpcomingDeadlines;
