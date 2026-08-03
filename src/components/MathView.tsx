import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

export function normalizeMathBlocks(content: string): string {
  return content
    .split(/(```[\s\S]*?```)/g)
    .map((part, index) => {
      if (index % 2 === 1) return part;
      return part.replace(/\$\$([\s\S]*?)\$\$/g, (_match, inner: string) => `\n\n$$\n${inner.trim()}\n$$\n\n`);
    })
    .join("");
}

export default function MathView({ content, className = "" }: { content: string; className?: string }) {
  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        skipHtml
        components={{
          a: ({ children, ...props }) => <a {...props} target="_blank" rel="noreferrer">{children}</a>,
          code: ({ children, className: codeClassName, ...props }) => (
            <code className={codeClassName} {...props}>{children}</code>
          ),
          table: ({ children }) => (
            <div className="markdown-table-wrap"><table>{children}</table></div>
          ),
        }}
      >
        {normalizeMathBlocks(content)}
      </ReactMarkdown>
    </div>
  );
}
