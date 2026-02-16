import { Component } from "react";

class WhiteboardErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("Whiteboard crashed:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full bg-base-100 flex items-center justify-center p-6">
          <div className="text-center space-y-3">
            <p className="font-semibold">Whiteboard failed to render.</p>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => this.setState({ hasError: false })}
            >
              Retry Whiteboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default WhiteboardErrorBoundary;
