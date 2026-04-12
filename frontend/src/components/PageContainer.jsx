/**
 * PageContainer.jsx
 * A reusable container component that standardizes page layout across the application.
 * Replaces the scattered padding and max-w structures.
 */
export default function PageContainer({ children, className = "" }) {
  return (
    <div
      className={`mx-auto w-full max-w-[1320px] px-4 md:px-6 lg:px-8 py-6 md:py-10 ${className}`}
    >
      {children}
    </div>
  );
}
