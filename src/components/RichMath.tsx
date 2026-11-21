import { InlineMath, BlockMath } from 'react-katex';

const SPLIT = /(\$\$[\s\S]*?\$\$|\$[^$]+\$)/g;

/**
 * Render a string that may contain inline `$...$` and block `$$...$$`
 * math mixed with plain text.
 */
export function RichMath({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts = text.split(SPLIT).filter((p) => p.length > 0);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2);
          return (
            <BlockMath
              key={i}
              math={math}
              errorColor="#f87171"
              throwOnError={false}
              trust={false}
            />
          );
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1);
          return (
            <InlineMath
              key={i}
              math={math}
              errorColor="#f87171"
              throwOnError={false}
              trust={false}
            />
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}