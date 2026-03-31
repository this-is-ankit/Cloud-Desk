function RoleBasedQuickStats({ stats = [] }) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-[1.75rem] border border-base-content/10 bg-base-100 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-base-content/60">{stat.label}</p>
              <h3 className="mt-3 text-3xl font-black tracking-tight text-base-content">{stat.value}</h3>
            </div>
            <div className={`rounded-2xl p-3 ${stat.iconWrapClass || "bg-primary/10 text-primary"}`}>
              <stat.icon className="w-6 h-6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default RoleBasedQuickStats;
