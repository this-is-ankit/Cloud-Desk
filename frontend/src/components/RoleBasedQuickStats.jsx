function RoleBasedQuickStats({ stats = [] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-base-100/50 backdrop-blur-md border border-base-content/10 p-6 rounded-2xl">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-base-content/60">{stat.label}</p>
              <h3 className="text-3xl font-bold mt-1">{stat.value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${stat.iconWrapClass || "bg-primary/10 text-primary"}`}>
              <stat.icon className="w-6 h-6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default RoleBasedQuickStats;
