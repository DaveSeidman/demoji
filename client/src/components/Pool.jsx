import { DemojiCard } from './DemojiCard.jsx';

export function Pool({ demojis, onVote, votingId, isLoading, emptyLabel }) {
  if (isLoading) {
    return (
      <div className="pool_status" role="status">
        Loading the voting pool...
      </div>
    );
  }

  if (!demojis.length) {
    return <div className="pool_status">{emptyLabel}</div>;
  }

  return (
    <div className="pool_grid">
      {demojis.map((demoji) => (
        <DemojiCard
          key={demoji._id}
          demoji={demoji}
          onVote={onVote}
          isVoting={votingId === demoji._id}
        />
      ))}
    </div>
  );
}
