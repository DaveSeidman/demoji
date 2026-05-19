import { ArrowUp, Sparkles } from 'lucide-react';

export function DemojiCard({ demoji, onVote, isVoting }) {
  return (
    <article className="demoji_card">
      <div className="demoji_card_image_wrap">
        <img className="demoji_card_image" src={demoji.imageUrl} alt={`${demoji.prompt} demoji`} />
        <div className="demoji_card_favicon_preview" title="Favicon size preview" aria-label="Favicon size preview">
          <img className="demoji_card_favicon_image" src={demoji.imageUrl} alt="" aria-hidden="true" />
        </div>
      </div>
      <div className="demoji_card_body">
        <div className="demoji_card_meta">
          <span className="demoji_card_model">
            <Sparkles size={14} aria-hidden="true" />
            AI
          </span>
        </div>
        <h3 className="demoji_card_title">{demoji.prompt}</h3>
        {demoji.description ? <p className="demoji_card_description">{demoji.description}</p> : null}
      </div>
      <button
        className="demoji_card_vote"
        type="button"
        onClick={() => onVote(demoji._id)}
        disabled={isVoting}
        title="Vote for this demoji"
      >
        <ArrowUp size={18} aria-hidden="true" />
        <span>{demoji.votes}</span>
      </button>
    </article>
  );
}
