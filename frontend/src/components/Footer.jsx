import { Link } from "react-router";

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-base-300 bg-base-100">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between md:px-6">
        <p className="text-xs uppercase tracking-wide text-base-content/70">
          {year} Cloud Desk. All rights reserved.
        </p>

        <div className="flex items-center gap-2">
          <Link to="/" className="btn btn-ghost btn-xs rounded-none">
            Home
          </Link>
          <Link to="/dashboard" className="btn btn-ghost btn-xs rounded-none">
            Dashboard
          </Link>
          <Link to="/problems" className="btn btn-ghost btn-xs rounded-none">
            Problems
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
