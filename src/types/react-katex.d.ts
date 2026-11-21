declare module 'react-katex' {
  import type * as React from 'react';

  interface KatexProps {
    children?: string;
    math?: string;
    errorColor?: string;
    renderError?: (error: Error) => React.ReactNode;
    throwOnError?: boolean;
    trust?: boolean;
    strict?: boolean | string;
    displayMode?: boolean;
    output?: 'html' | 'mathml' | 'htmlAndMathml';
  }

  interface MathProps extends KatexProps {
    block?: boolean;
    settings?: Record<string, unknown>;
  }

  export const InlineMath: React.FC<MathProps>;
  export const BlockMath: React.FC<MathProps>;
}