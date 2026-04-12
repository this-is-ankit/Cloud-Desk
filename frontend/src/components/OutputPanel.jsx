function OutputPanel({ output }) {
  return (
    <div className="h-full bg-base-100 flex flex-col">
      <div className="px-6 py-3 bg-base-100 border-b border-base-content/5 font-semibold text-sm text-base-content/70">
        Output
      </div>
      <div className="flex-1 overflow-auto px-6 py-4">
        {output === null ? (
          <p className="text-base-content/50 text-sm">
            Click "Run Code" to see the output here...
          </p>
        ) : output.success ? (
          <pre className="text-sm font-mono text-success whitespace-pre-wrap">
            {output.output}
          </pre>
        ) : (
          <div>
            {output.output && (
              <pre className="text-sm font-mono text-base-content whitespace-pre-wrap mb-2">
                {output.output}
              </pre>
            )}
            <pre className="text-sm font-mono text-error whitespace-pre-wrap">
              {output.error}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
export default OutputPanel;
