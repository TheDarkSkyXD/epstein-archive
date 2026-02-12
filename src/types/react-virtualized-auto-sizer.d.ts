declare module 'react-virtualized-auto-sizer' {
  import { PureComponent, ReactNode } from 'react';

  export interface Size {
    height: number;
    width: number;
  }

  export interface AutoSizerProps {
    children: (size: Size) => ReactNode;
    className?: string;
    defaultHeight?: number;
    defaultWidth?: number;
    disableHeight?: boolean;
    disableWidth?: boolean;
    nonce?: string;
    onResize?: (size: Size) => void;
    style?: React.CSSProperties;
  }

  export default class AutoSizer extends PureComponent<AutoSizerProps> {}
}

declare module 'react-virtualized-auto-sizer/dist/react-virtualized-auto-sizer.cjs' {
  import AutoSizer from 'react-virtualized-auto-sizer';
  export default AutoSizer;
}
