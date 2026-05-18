import { Search } from 'lucide-react';

export function SearchBar({ value, onChange, onSubmit, isLoading }) {
  return (
    <form className="search_bar" onSubmit={onSubmit}>
      <div className="search_bar_field">
        <Search className="search_bar_icon" size={20} aria-hidden="true" />
        <input
          className="search_bar_input"
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search first: rollerblades, inbox zero, social battery..."
          aria-label="Search existing demoji submissions"
        />
      </div>
      <button className="button button_secondary" type="submit" disabled={isLoading}>
        Search
      </button>
    </form>
  );
}
