/** Drip chain definitions: [step] → { template, delayMs } */
export interface ChainStep {
  template: string;
  /** задержка от старта цепочки, мс */
  delayMs: number;
}
