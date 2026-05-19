import { useCallback, useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Pool } from './components/Pool.jsx';
import { SearchBar } from './components/SearchBar.jsx';
import { SubmissionForm } from './components/SubmissionForm.jsx';
import { checkDemoji, createDemoji, fetchDemojis, previewDemoji, voteForDemoji } from './services/api.js';

const initialForm = {
  prompt: '',
  description: ''
};

function getInitialTheme() {
  const saved = window.localStorage.getItem('demojis:theme');

  if (saved) {
    return saved;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [activeView, setActiveView] = useState('create');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('popular');
  const [demojis, setDemojis] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [draft, setDraft] = useState(null);
  const [refinement, setRefinement] = useState('');
  const [checkResult, setCheckResult] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [votingId, setVotingId] = useState('');

  const loadDemojis = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await fetchDemojis({ search, sort });
      setDemojis(data.demojis);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }, [search, sort]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('demojis:theme', theme);
  }, [theme]);

  useEffect(() => {
    if (activeView === 'vote') {
      loadDemojis();
    }
  }, [activeView, loadDemojis]);

  useEffect(() => {
    if (!progress?.active) {
      return undefined;
    }

    const startedAt = progress.startedAt;
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [progress]);

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setCheckResult(null);
    if (name === 'prompt') {
      setDraft(null);
    }
    setStatus('');
    setError('');
    setProgress(null);
  }

  function handleResetCreation() {
    setForm(initialForm);
    setDraft(null);
    setRefinement('');
    setCheckResult(null);
    setStatus('');
    setError('');
    setProgress(null);
  }

  function setActiveProgress(step, totalSteps, label, detail) {
    setElapsedSeconds(0);
    setProgress({
      active: true,
      step,
      totalSteps,
      label,
      detail,
      startedAt: Date.now()
    });
  }

  function setCompleteProgress(label, detail) {
    setProgress((current) => ({
      active: false,
      step: current?.totalSteps || 1,
      totalSteps: current?.totalSteps || 1,
      label,
      detail,
      startedAt: current?.startedAt || Date.now()
    }));
  }

  function setFailedProgress(label, detail) {
    setProgress((current) => ({
      active: false,
      failed: true,
      step: current?.step || 1,
      totalSteps: current?.totalSteps || 1,
      label,
      detail,
      startedAt: current?.startedAt || Date.now()
    }));
  }

  async function handleCheck() {
    if (!form.prompt.trim()) {
      return null;
    }

    setIsChecking(true);
    setError('');
    setActiveProgress(1, 2, 'Checking idea', 'Looking for existing Unicode emoji and matching pool submissions.');

    try {
      const result = await checkDemoji(form.prompt);
      setCheckResult(result);
      setCompleteProgress(
        result.canGenerate ? 'Idea available' : 'Idea blocked',
        result.canGenerate ? 'No matching emoji or pool submission found.' : 'This idea already exists.'
      );
      return result;
    } catch (requestError) {
      setError(requestError.message);
      setFailedProgress('Check failed', requestError.message);
      if (requestError.payload?.existingStandard) {
        setCheckResult({
          canGenerate: false,
          existingStandard: requestError.payload.existingStandard
        });
      }
      return null;
    } finally {
      setIsChecking(false);
    }
  }

  async function handleGenerateDraft() {
    setStatus('');
    setError('');

    const result = checkResult || (await handleCheck());

    if (!result?.canGenerate) {
      return;
    }

    setIsGeneratingPreview(true);
    setActiveProgress(2, 3, 'Generating draft', 'Generating your emoji image.');

    try {
      const data = await previewDemoji({
        ...form,
        refinement
      });

      setDraft(data.draft);
      setCompleteProgress('Draft ready', 'Review the large and 16px previews, then refine or submit.');
      setStatus('Draft generated. Refine it again or submit it to the pool.');
    } catch (requestError) {
      setError(requestError.message);
      setFailedProgress('Generation failed', requestError.message);
      if (requestError.payload?.existingStandard) {
        setCheckResult({
          canGenerate: false,
          existingStandard: requestError.payload.existingStandard
        });
      }
      if (requestError.payload?.existingSubmission) {
        setCheckResult({
          canGenerate: false,
          existingSubmission: requestError.payload.existingSubmission
        });
      }
    } finally {
      setIsGeneratingPreview(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('');
    setError('');

    if (!draft?.imageUrl) {
      setError('Generate a draft before submitting to the pool.');
      return;
    }

    const result = checkResult || (await handleCheck());

    if (!result?.canGenerate) {
      return;
    }

    setIsSubmitting(true);
    setActiveProgress(1, 2, 'Submitting draft', 'Saving the selected image to the voting pool.');

    try {
      const data = await createDemoji({
        ...form,
        refinement,
        imageUrl: draft.imageUrl,
        generationModel: draft.generationModel
      });
      setDemojis((current) => [data.demoji, ...current]);
      setForm(initialForm);
      setDraft(null);
      setRefinement('');
      setCheckResult(null);
      setSearch('');
      setCompleteProgress('Submitted', 'The selected draft is now live in the voting pool.');
      setStatus('Added the selected draft to the voting pool.');
      setActiveView('vote');
    } catch (requestError) {
      setError(requestError.message);
      setFailedProgress('Submit failed', requestError.message);
      if (requestError.payload?.existingStandard) {
        setCheckResult({
          canGenerate: false,
          existingStandard: requestError.payload.existingStandard
        });
      }
      if (requestError.payload?.existingSubmission) {
        setCheckResult({
          canGenerate: false,
          existingSubmission: requestError.payload.existingSubmission
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVote(id) {
    setVotingId(id);
    setError('');

    try {
      const data = await voteForDemoji(id);
      setDemojis((current) => current.map((demoji) => (demoji._id === id ? data.demoji : demoji)));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setVotingId('');
    }
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    loadDemojis();
  }

  return (
    <main className="app">
      <header className="app_header">
        <nav className="app_nav" aria-label="Demomojis navigation">
          <div className="brand">
            <h1 className="brand_title">Demomojis</h1>
            <p className="brand_subtitle">The proving ground for the next generation of emojis</p>
          </div>
          <div className="app_controls">
            <div className="view_switch" aria-label="Switch views">
              <button
                className={activeView === 'create' ? 'view_switch_button view_switch_button_active' : 'view_switch_button'}
                type="button"
                onClick={() => setActiveView('create')}
              >
                Create
              </button>
              <button
                className={activeView === 'vote' ? 'view_switch_button view_switch_button_active' : 'view_switch_button'}
                type="button"
                onClick={() => setActiveView('vote')}
              >
                Vote
              </button>
            </div>
            <button
              className="icon_button"
              type="button"
              onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
              aria-label="Toggle dark mode"
              title="Toggle dark mode"
            >
              {theme === 'dark' ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
            </button>
          </div>
        </nav>
      </header>

      {activeView === 'create' ? (
        <section className="create_view">
          <SubmissionForm
            form={form}
            draft={draft}
            refinement={refinement}
            onChange={handleFormChange}
            onRefinementChange={setRefinement}
            onGenerateDraft={handleGenerateDraft}
            onSubmit={handleSubmit}
            onCheck={handleCheck}
            onReset={handleResetCreation}
            checkResult={checkResult}
            progress={progress}
            elapsedSeconds={elapsedSeconds}
            isChecking={isChecking}
            isGeneratingPreview={isGeneratingPreview}
            isSubmitting={isSubmitting}
          />

          {status ? <div className="floating_notice floating_notice_success">{status}</div> : null}
          {error ? <div className="floating_notice floating_notice_error">{error}</div> : null}
        </section>
      ) : (
        <section className="vote_view">
          <div className="vote_header">
            <div>
              <h2 className="vote_title">Vote on the pool</h2>
              <p className="vote_count">{demojis.length} submissions</p>
            </div>
            <div className="segmented" aria-label="Sort submissions">
              <button
                className={sort === 'popular' ? 'segmented_button segmented_button_active' : 'segmented_button'}
                type="button"
                onClick={() => setSort('popular')}
              >
                Popular
              </button>
              <button
                className={sort === 'new' ? 'segmented_button segmented_button_active' : 'segmented_button'}
                type="button"
                onClick={() => setSort('new')}
              >
                New
              </button>
            </div>
          </div>

          <SearchBar value={search} onChange={setSearch} onSubmit={handleSearchSubmit} isLoading={isLoading} />

          {status ? <div className="notice notice_success">{status}</div> : null}
          {error ? <div className="notice notice_error">{error}</div> : null}

          <Pool
            demojis={demojis}
            onVote={handleVote}
            votingId={votingId}
            isLoading={isLoading}
            emptyLabel={search ? 'No submissions match that search yet.' : 'No submissions yet. Generate the first missing emoji.'}
          />
        </section>
      )}
    </main>
  );
}
