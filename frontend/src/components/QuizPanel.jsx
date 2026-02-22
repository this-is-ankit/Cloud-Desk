import { useEffect, useState } from "react";
import { Clock3Icon, SendIcon, TrophyIcon, UploadIcon, XIcon } from "./icons/ModernIcons";

const formatRemaining = (endsAt) => {
  const remainingMs = Math.max(0, (endsAt || 0) - Date.now());
  return Math.ceil(remainingMs / 1000);
};

function QuizPanel({
  isHost,
  isOpen,
  activeRound,
  quizBank,
  leaderboard,
  top3,
  mySubmission,
  roundResult,
  onClose,
  onUploadQuiz,
  onAddManualQuestion,
  onStartRound,
  onEndRound,
  onSubmitAnswer,
}) {
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [manualQuestion, setManualQuestion] = useState({
    prompt: "",
    options: ["", "", "", ""],
    correctOptionIndex: 0,
    timeLimitSec: 30,
    explanation: "",
  });
  const [secondsLeft, setSecondsLeft] = useState(null);

  useEffect(() => {
    if (!activeRound?.endsAt) {
      setSecondsLeft(null);
      return undefined;
    }

    const tick = () => setSecondsLeft(formatRemaining(activeRound.endsAt));
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [activeRound?.endsAt]);

  if (!isOpen) return null;

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const parsed = JSON.parse(content);
      onUploadQuiz(parsed);
      event.target.value = "";
    } catch {
      onUploadQuiz(null);
    }
  };

  const updateOption = (index, value) => {
    const nextOptions = [...manualQuestion.options];
    nextOptions[index] = value;
    setManualQuestion((prev) => ({ ...prev, options: nextOptions }));
  };

  const handleAddQuestion = () => {
    onAddManualQuestion(manualQuestion);
    setManualQuestion({
      prompt: "",
      options: ["", "", "", ""],
      correctOptionIndex: 0,
      timeLimitSec: 30,
      explanation: "",
    });
  };

  const hasSubmitted = Boolean(mySubmission);

  return (
    <div className="absolute right-4 bottom-4 z-40 w-[380px] max-h-[85%] overflow-y-auto rounded-xl border border-base-300 bg-base-100 shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-base-300 bg-base-100 px-3 py-2">
        <h3 className="font-semibold">Quiz</h3>
        <button className="btn btn-ghost btn-xs" onClick={onClose}>
          <XIcon className="size-4" />
        </button>
      </div>

      <div className="space-y-4 p-3">
        {activeRound && (
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="badge badge-primary">Live Question</span>
              <span className="flex items-center gap-1 text-sm font-medium">
                <Clock3Icon className="size-4" /> {secondsLeft ?? 0}s
              </span>
            </div>
            <p className="mb-2 text-sm font-medium">{activeRound.prompt}</p>
            <div className="space-y-2">
              {activeRound.options?.map((option, index) => {
                const isSelected = mySubmission?.selectedOptionIndex === index;
                return (
                  <button
                    key={`${activeRound.roundId}-opt-${index}`}
                    className={`btn btn-sm w-full justify-start ${
                      isSelected ? "btn-primary" : "btn-outline"
                    }`}
                    disabled={isHost || hasSubmitted}
                    onClick={() => onSubmitAnswer(index)}
                  >
                    {String.fromCharCode(65 + index)}. {option}
                  </button>
                );
              })}
            </div>

            {!isHost && hasSubmitted && (
              <p className="mt-2 text-xs text-success">Answer submitted. Waiting for round end.</p>
            )}

            {isHost && (
              <button className="btn btn-warning btn-sm mt-3 w-full" onClick={onEndRound}>
                End Round
              </button>
            )}
          </div>
        )}

        {roundResult && !activeRound && (
          <div className="rounded-lg border border-secondary/30 bg-secondary/10 p-3 text-sm">
            <p className="font-medium">Last round ended</p>
            <p>
              Correct option:{" "}
              <span className="font-semibold">
                {String.fromCharCode(65 + (roundResult.correctOptionIndex ?? 0))}
              </span>
            </p>
            {roundResult.explanation ? (
              <p className="mt-1 text-xs text-base-content/70">{roundResult.explanation}</p>
            ) : null}
          </div>
        )}

        {isHost && (
          <>
            <div className="rounded-lg border border-base-300 p-3">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                <UploadIcon className="size-4" /> Upload quiz JSON
              </label>
              <input
                type="file"
                accept=".json,application/json"
                className="file-input file-input-bordered file-input-sm w-full"
                onChange={handleFileUpload}
              />
            </div>

            <div className="rounded-lg border border-base-300 p-3">
              <p className="mb-2 text-sm font-medium">Add question manually</p>
              <textarea
                className="textarea textarea-bordered textarea-sm w-full"
                placeholder="Question prompt"
                value={manualQuestion.prompt}
                onChange={(e) => setManualQuestion((prev) => ({ ...prev, prompt: e.target.value }))}
              />
              <div className="mt-2 grid gap-2">
                {manualQuestion.options.map((option, index) => (
                  <input
                    key={`manual-opt-${index}`}
                    className="input input-bordered input-sm w-full"
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                  />
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <select
                  className="select select-bordered select-sm flex-1"
                  value={manualQuestion.correctOptionIndex}
                  onChange={(e) =>
                    setManualQuestion((prev) => ({
                      ...prev,
                      correctOptionIndex: Number.parseInt(e.target.value, 10),
                    }))
                  }
                >
                  <option value={0}>Correct: A</option>
                  <option value={1}>Correct: B</option>
                  <option value={2}>Correct: C</option>
                  <option value={3}>Correct: D</option>
                </select>
                <input
                  type="number"
                  min={10}
                  max={120}
                  className="input input-bordered input-sm w-24"
                  value={manualQuestion.timeLimitSec}
                  onChange={(e) =>
                    setManualQuestion((prev) => ({
                      ...prev,
                      timeLimitSec: Number.parseInt(e.target.value, 10) || 30,
                    }))
                  }
                />
              </div>
              <textarea
                className="textarea textarea-bordered textarea-sm mt-2 w-full"
                placeholder="Explanation (optional)"
                value={manualQuestion.explanation}
                onChange={(e) =>
                  setManualQuestion((prev) => ({ ...prev, explanation: e.target.value }))
                }
              />
              <button className="btn btn-primary btn-sm mt-2 w-full" onClick={handleAddQuestion}>
                Add Question
              </button>
            </div>

            <div className="rounded-lg border border-base-300 p-3">
              <p className="mb-2 text-sm font-medium">Question bank ({quizBank.length})</p>
              <select
                className="select select-bordered select-sm w-full"
                value={selectedQuestionId}
                onChange={(e) => setSelectedQuestionId(e.target.value)}
              >
                <option value="">Select question</option>
                {quizBank.map((question) => (
                  <option key={question.id} value={question.id}>
                    {question.prompt}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-secondary btn-sm mt-2 w-full"
                disabled={!selectedQuestionId || Boolean(activeRound)}
                onClick={() => onStartRound(selectedQuestionId)}
              >
                <SendIcon className="size-4" /> Start Round
              </button>
            </div>
          </>
        )}

        <div className="rounded-lg border border-base-300 p-3">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <TrophyIcon className="size-4 text-warning" /> Leaderboard
          </p>
          {(top3?.length || leaderboard?.length) > 0 ? (
            <div className="space-y-2">
              {(top3 || []).map((entry, index) => (
                <div
                  key={`top3-${entry.userId}`}
                  className="flex items-center justify-between rounded bg-base-200 px-2 py-1 text-sm"
                >
                  <span>
                    #{index + 1} {entry.name}
                  </span>
                  <span className="font-semibold">{entry.score}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-base-content/60">No scores yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuizPanel;
