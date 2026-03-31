import { Link } from "react-router";
import PageContainer from "./PageContainer";

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-base-content/10 bg-base-100/70 backdrop-blur-sm">
      <PageContainer className="py-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-base-content">Cloud Desk</p>
            <p className="mt-1 text-sm text-base-content/60">
              Live teaching, collaborative classes, and real-time coding in one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link to="/" className="btn btn-ghost btn-sm rounded-xl text-base-content/70 hover:text-base-content">
              Home
            </Link>
            <Link to="/dashboard" className="btn btn-ghost btn-sm rounded-xl text-base-content/70 hover:text-base-content">
              Dashboard
            </Link>
            <Link to="/courses" className="btn btn-ghost btn-sm rounded-xl text-base-content/70 hover:text-base-content">
              Courses
            </Link>
            <Link to="/teachers" className="btn btn-ghost btn-sm rounded-xl text-base-content/70 hover:text-base-content">
              Teachers
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-base-content/10 pt-5 text-sm text-base-content/55 md:flex-row md:items-center md:justify-between">
          <p>{year} Cloud Desk. All rights reserved.</p>
          <p>Built for live-first teaching and collaborative learning.</p>
        </div>
      </PageContainer>
    </footer>
  );
}

export default Footer;
