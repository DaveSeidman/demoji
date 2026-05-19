import { Send, WandSparkles } from 'lucide-react';

const styleOptions = [
  { value: 'apple', label: 'Apple' },
  { value: 'google', label: 'Google' },
  { value: 'microsoft', label: 'Microsoft' },
  { value: 'samsung', label: 'Samsung' },
  { value: 'twitter', label: 'Twitter' }
];

export function SubmissionForm({
  form,
  draft,
  refinement,
  onChange,
  onRefinementChange,
  onGenerateDraft,
  onSubmit,
  onCheck,
  onReset,
  checkResult,
  progress,
  elapsedSeconds,
  isChecking,
  isGeneratingPreview,
  isSubmitting
}) {
  const canGenerate = checkResult?.canGenerate !== false;
  const hasDraft = Boolean(draft?.imageUrl);
  const progressPercent = progress ? Math.round((progress.step / progress.totalSteps) * 100) : 0;
  const progressLabel = progress?.label || 'Generating emoji';

  function handleFormSubmit(event) {
    event.preventDefault();

    if (hasDraft) {
      onSubmit(event);
      return;
    }

    onGenerateDraft();
  }

  if (isGeneratingPreview) {
    return (
      <div className="creation_progress" role="status">
        <div className="radial_progress" aria-hidden="true">
          <span className="radial_progress_core">{elapsedSeconds}s</span>
        </div>
        <div className="creation_progress_text">
          <h2 className="creation_progress_title">{progressLabel}</h2>
          <p className="creation_progress_detail">{progress?.detail || 'Generating your emoji image.'}</p>
        </div>
      </div>
    );
  }

  return (
    <form className={hasDraft ? 'submission submission_editor' : 'submission submission_start'} onSubmit={handleFormSubmit}>
      {!hasDraft ? (
        <>
          <div className="creation_intro">
            <h2 className="creation_title">What emoji is missing?</h2>
            <p className="creation_copy">Start with the emoji idea. Existing emoji are checked before generation.</p>
          </div>

          <div className="prompt_composer">
            <input
              className="prompt_composer_input"
              name="prompt"
              value={form.prompt}
              onChange={onChange}
              placeholder="rollerblades"
              maxLength="120"
              autoComplete="off"
              autoFocus
              required
            />
            <button className="prompt_composer_button" type="submit" disabled={isChecking || !canGenerate || !form.prompt.trim()}>
              <WandSparkles size={20} aria-hidden="true" />
              {isChecking ? 'Checking' : 'Generate'}
            </button>
          </div>

          <div className="creation_options">
            <label className="field field_compact">
              <span className="field_label">Style</span>
              <select className="field_select" name="styleSet" value={form.styleSet} onChange={onChange}>
                {styleOptions.map((style) => (
                  <option key={style.value} value={style.value}>
                    {style.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="button button_ghost" type="button" onClick={onCheck} disabled={isChecking || !form.prompt.trim()}>
              Check only
            </button>
          </div>

          {checkResult ? (
            <div className={canGenerate ? 'submission_notice submission_notice_good' : 'submission_notice submission_notice_blocked'}>
              {checkResult.canGenerate
                ? 'No existing standard emoji or matching submission found.'
                : checkResult.existingSubmission
                  ? 'This idea is already in the pool. Vote for it instead.'
                  : checkResult.existingStandard?.reason || 'This idea appears to already exist.'}
            </div>
          ) : null}
        </>
      ) : (
        <div className="editor">
          <div className="editor_preview">
            <div className="editor_preview_stage">
              <img className="editor_preview_image" src={draft.imageUrl} alt={`${form.prompt} draft demoji`} />
              <div className="editor_preview_tiny" title="Favicon size preview" aria-label="Favicon size preview">
                <img className="editor_preview_tiny_image" src={draft.imageUrl} alt="" aria-hidden="true" />
              </div>
            </div>
          </div>

          <div className="editor_controls">
            {progress ? (
              <div className={progress.failed ? 'progress progress_failed' : 'progress'} role="status">
                <div className="progress_header">
                  <span className="progress_label">{progress.label}</span>
                  <span className="progress_time">{progress.failed ? 'Stopped' : progress.active ? `${elapsedSeconds}s` : 'Done'}</span>
                </div>
                <div className="progress_track" aria-hidden="true">
                  <div className="progress_fill" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            ) : null}

            <div className="editor_fields">
              <div className="refinement_control">
                <label className="field refinement_control_field">
                  <span className="field_label">Refinement notes</span>
                  <textarea
                    className="field_textarea field_textarea_compact"
                    value={refinement}
                    onChange={(event) => onRefinementChange(event.target.value)}
                    placeholder="Simpler silhouette, no circle, less detail, larger main shape..."
                    maxLength="260"
                    rows="2"
                  />
                </label>
                <button
                  className="button button_primary button_refine"
                  type="button"
                  onClick={onGenerateDraft}
                  disabled={isGeneratingPreview || !canGenerate || !form.prompt.trim()}
                >
                  Refine
                </button>
              </div>

            </div>

            <div className="editor_actions">
              <button className="button button_ghost" type="button" onClick={onReset}>
                Start over
              </button>

              <button className="button button_primary" type="submit" disabled={isSubmitting || !canGenerate}>
                <Send size={18} aria-hidden="true" />
                {isSubmitting ? 'Submitting...' : 'Submit to pool'}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
