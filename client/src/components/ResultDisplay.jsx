import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ResultDisplay({ title, content, loading, error }) {
  return (
    <div className="result-display">
      <h3>{title}</h3>
      {loading && <p className="state loading">Summoning ideas from the tavern of AI...</p>}
      {error && <p className="state error">{error}</p>}
      {!loading && !error && !content && (
        <p className="state idle">Generated content will appear here.</p>
      )}
      {!loading && !error && content && (
        <article className="markdown-output">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </article>
      )}
    </div>
  );
}
